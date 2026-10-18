import os
import random
import json
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from engine import compute_match, run_allocation

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

def generate_mock_data():
    random.seed(42)
    
    states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Uttar Pradesh', 'Gujarat']
    sectors = ['IT', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Agriculture']
    roles = ['Data Analyst', 'Software Developer', 'Project Manager', 'Researcher', 'UI Designer', 'Marketing Executive']
    locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad']
    rural_locations = ['Village A', 'Village B', 'Rural District 1', 'Rural District 2', 'Rural District 3']
    qualifications = ['B.Tech', 'BCA', 'B.Sc', 'MBA', 'M.Tech', 'Diploma']
    skills_pool = ['Python', 'SQL', 'Data Analysis', 'Java', 'React', 'Machine Learning', 'Excel', 'Communication', 'Project Management', 'Design']
    
    candidates = []
    
    aarav = {
        'id': 0, 'name': 'Aarav Sharma', 'qualification': 'B.Tech', 
        'skills': ['Python', 'SQL', 'Data Analysis'], 'preferred_sector': 'IT', 
        'preferred_role': 'Data Analyst', 
        'current_location': 'Mumbai', 'preferred_location': 'Mumbai', 
        'location_type': 'Urban',
        'previous_participation': False, 'state': 'Maharashtra',
        'cgpa': 8.5
    }
    candidates.append(aarav)
    
    for i in range(1, 1026):
        is_rural = random.random() < 0.4
        curr_loc = random.choice(rural_locations) if is_rural else random.choice(locations)
        pref_loc = random.choice(locations)
        
        candidates.append({
            'id': i, 'name': f'Candidate {i}', 'qualification': random.choice(qualifications),
            'skills': random.sample(skills_pool, random.randint(2, 5)), 'preferred_sector': random.choice(sectors),
            'preferred_role': random.choice(roles), 
            'current_location': curr_loc,
            'preferred_location': pref_loc,
            'location_type': 'Rural' if is_rural else 'Urban',
            'previous_participation': random.choice([True, False]),
            'state': random.choice(states),
            'cgpa': round(random.uniform(6.0, 10.0), 1)
        })
        
    internships = []
    for i in range(1, 31):
        cap = random.randint(5, 20)
        internships.append({
            'id': i, 'company': f'Company {i}', 'role': random.choice(roles),
            'location': random.choice(locations), 'sector': random.choice(sectors),
            'required_qualification': random.choice(qualifications), 
            'required_skills': random.sample(skills_pool, random.randint(2, 4)),
            'capacity': cap, 'filled': 0
        })
        
    return candidates, internships

CANDIDATES, INTERNSHIPS = generate_mock_data()
ALLOCATIONS = []
PENDING = []
POLICIES = {'rural_priority': 3, 'prev_participation_penalty': 5}

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    return jsonify(CANDIDATES)

@app.route('/api/internships', methods=['GET'])
def get_internships():
    return jsonify(INTERNSHIPS)

@app.route('/api/post_internship', methods=['POST'])
def post_internship():
    data = request.json
    new_id = max([i['id'] for i in INTERNSHIPS]) + 1 if INTERNSHIPS else 1
    new_intern = {
        'id': new_id, 'company': data.get('company', 'New Company'), 
        'role': data.get('role', 'General'), 'location': data.get('location', 'Mumbai'),
        'sector': data.get('sector', 'IT'), 'required_qualification': data.get('qualification', 'B.Tech'),
        'required_skills': data.get('skills', []), 'capacity': int(data.get('capacity', 10)), 'filled': 0
    }
    INTERNSHIPS.append(new_intern)
    return jsonify(new_intern)

@app.route('/api/apply', methods=['POST'])
def apply_candidate():
    data = request.json
    new_id = max([c['id'] for c in CANDIDATES]) + 1 if CANDIDATES else 1
    
    cgpa_input = data.get('cgpa')
    final_cgpa = float(cgpa_input) if cgpa_input is not None else round(random.uniform(6.0, 9.5), 1)
    
    new_cand = {
        'id': new_id, 
        'name': data.get('name', 'New Student'), 
        'qualification': data.get('qualification', 'B.Tech'),
        'skills': data.get('skills', []), 
        'preferred_sector': data.get('sector', 'IT'),
        'preferred_role': data.get('role', 'Developer'), 
        'current_location': data.get('current_location', 'Mumbai'),
        'preferred_location': data.get('preferred_location', 'Mumbai'),
        'location_type': data.get('location_type', 'Urban'),
        'previous_participation': False, 
        'state': data.get('state', 'Maharashtra'), 
        'cgpa': final_cgpa
    }
    CANDIDATES.append(new_cand)
    return jsonify(new_cand)

@app.route('/api/match', methods=['POST'])
def match_candidate():
    data = request.json
    cand_id = data.get('candidate_id')
    intern_id = data.get('internship_id')
    
    cand = next((c for c in CANDIDATES if c['id'] == cand_id), None)
    
    if intern_id:
        intern = next((i for i in INTERNSHIPS if i['id'] == intern_id), None)
        if cand and intern:
            return jsonify([compute_match(cand, intern, POLICIES)])
            
    if cand:
        matches = []
        for intern in INTERNSHIPS:
            if intern['filled'] < intern['capacity']:
                matches.append(compute_match(cand, intern, POLICIES))
        matches.sort(key=lambda x: x['final_score'], reverse=True)
        return jsonify(matches[:5])
        
    return jsonify([])

@app.route('/api/allocate', methods=['POST'])
def allocate():
    global ALLOCATIONS, PENDING
    for i in INTERNSHIPS: i['filled'] = 0
    ALLOCATIONS, PENDING = run_allocation(CANDIDATES, INTERNSHIPS, POLICIES)
    return jsonify({'status': 'success', 'allocated': len(ALLOCATIONS), 'pending': len(PENDING)})

@app.route('/api/allocate_single', methods=['POST'])
def allocate_single():
    global ALLOCATIONS, PENDING
    data = request.json
    cand_id = data.get('candidate_id')
    intern_id = data.get('internship_id')
    
    cand = next((c for c in CANDIDATES if c['id'] == cand_id), None)
    intern = next((i for i in INTERNSHIPS if i['id'] == intern_id), None)
    
    if not cand or not intern:
        return jsonify({'error': 'Candidate or Internship not found'}), 404
        
    if any(a['candidate_id'] == cand_id for a in ALLOCATIONS):
        return jsonify({'error': 'Candidate is already allocated'}), 400
        
    if intern['filled'] >= intern['capacity']:
        return jsonify({'error': 'Internship is full'}), 400
        
    match_data = compute_match(cand, intern, POLICIES)
    intern['filled'] += 1
    match_data['filled'] = intern['filled']
    
    ALLOCATIONS.append(match_data)
    PENDING = [p for p in PENDING if p['candidate']['id'] != cand_id]
    
    return jsonify({'status': 'success', 'allocation': match_data})

@app.route('/api/allocations', methods=['GET'])
def get_allocations():
    return jsonify({'allocations': ALLOCATIONS, 'pending': PENDING})

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    sector_dist = {}
    for i in INTERNSHIPS: sector_dist[i['sector']] = sector_dist.get(i['sector'], 0) + 1
    
    alloc_status = {'Allocated': len(ALLOCATIONS), 'Pending': len(PENDING)}
    
    rural_urban = {'Rural': 0, 'Urban': 0}
    for c in CANDIDATES: rural_urban[c['location_type']] += 1
    
    
    scores = [a['final_score'] for a in ALLOCATIONS] if ALLOCATIONS else []
    score_dist = {"90-100%": 0, "80-89%": 0, "70-79%": 0, "40-70%":0}
    for s in scores:
        if s >= 90: score_dist["90-100%"] += 1
        elif s >= 80: score_dist["80-89%"] += 1
        elif s >= 70: score_dist["70-79%"] += 1
        elif s>=40 and s<70: score_dist["40-70%"] += 1
    
    capacity_util = []
    for i in INTERNSHIPS:
        capacity_util.append({'company': i['company'], 'filled': i['filled'], 'capacity': i['capacity']})
        
    return jsonify({
        'sector_distribution': sector_dist,
        'allocation_status': alloc_status,
        'rural_urban': rural_urban,
        'score_distribution': score_dist, 
        'capacity_utilization': capacity_util,
        'total_candidates': len(CANDIDATES),
        'total_internships': len(INTERNSHIPS),
        'available_seats': sum(i['capacity'] - i['filled'] for i in INTERNSHIPS),
        'successful_allocations': len(ALLOCATIONS),
        'avg_match_score': round(sum(scores)/len(scores), 1) if scores else 0,
        'allocation_rate': round((len(ALLOCATIONS)/len(CANDIDATES))*100, 1) if CANDIDATES else 0,
        'rural_rep': round((rural_urban['Rural']/len(CANDIDATES))*100, 1) if CANDIDATES else 0
    })

@app.route('/api/reset', methods=['POST'])
def reset():
    global CANDIDATES, INTERNSHIPS, ALLOCATIONS, PENDING
    CANDIDATES, INTERNSHIPS = generate_mock_data()
    ALLOCATIONS = []
    PENDING = []
    return jsonify({'status': 'reset'})

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)