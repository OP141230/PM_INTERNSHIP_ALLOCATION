def compute_match(candidate, internship, policies):
    cand_skills = set(candidate.get('skills', []))
    intern_skills = set(internship.get('required_skills', []))
    
    skill_overlap = len(cand_skills.intersection(intern_skills))
    skill_max = max(len(intern_skills), 1)
    
    skill_score = (skill_overlap / skill_max) * 35.0
    qual_score = 20.0 if candidate.get('qualification') == internship.get('required_qualification') else 0.0
    role_score = 20.0 if candidate.get('preferred_role') == internship.get('role') else 0.0
    sector_score = 15.0 if candidate.get('preferred_sector') == internship.get('sector') else 0.0
    loc_score = 10.0 if candidate.get('preferred_location') == internship.get('location') else 0.0
    
    match_score = skill_score + qual_score + role_score + sector_score + loc_score
    
    adjustment = 0.0
    if policies.get('rural_priority', 0) > 0 and candidate.get('location_type') == 'Rural':
        adjustment += policies['rural_priority']
        
    penalty = 0.0
    if candidate.get('previous_participation') and policies.get('prev_participation_penalty', 0) > 0:
        penalty = policies['prev_participation_penalty']
        
    final_score = match_score + adjustment - penalty
    
    reasons = []
    if skill_score >= 25: reasons.append("Strong skill match")
    if qual_score == 20: reasons.append("Qualification requirement satisfied")
    if role_score == 20: reasons.append("Preferred role matches perfectly")
    if sector_score == 15: reasons.append("Preferred sector matches")
    if loc_score == 10: reasons.append("Preferred location matches")
    if internship.get('capacity', 0) > internship.get('filled', 0): reasons.append("Internship has available capacity")
    if not reasons: reasons.append("General baseline match")
    
    return {
        'candidate_id': candidate['id'],
        'candidate_name': candidate['name'],
        'internship_id': internship['id'],
        'company': internship['company'],
        'role': internship['role'],
        'location': internship['location'],
        'sector': internship['sector'],
        'capacity': internship['capacity'],
        'filled': internship['filled'],
        'breakdown': {
            'skill': round(skill_score, 1),
            'qualification': round(qual_score, 1),
            'role': round(role_score, 1),
            'sector': round(sector_score, 1),
            'location': round(loc_score, 1)
        },
        'match_score': round(match_score, 1),
        'adjustment': round(adjustment, 1),
        'penalty': round(penalty, 1),
        'final_score': round(final_score, 1),
        'reasons': reasons
    }

def run_allocation(candidates, internships, policies):
    allocations = []
    pending = []
    allocated_candidate_ids = set()

    all_possible_matches = []
    for cand in candidates:
        for intern in internships:
            match_data = compute_match(cand, intern, policies)
            
            if match_data['final_score'] >= 40: 
                all_possible_matches.append((cand, intern, match_data))
     
    all_possible_matches.sort(
        key=lambda x: (x[2]['final_score'], x[0].get('cgpa', 0)), 
        reverse=True
    )
    
    for cand, intern, match_data in all_possible_matches:
        if cand['id'] in allocated_candidate_ids:
            continue
            
        if intern['filled'] >= intern['capacity']:
            continue
            
        intern['filled'] += 1
        allocated_candidate_ids.add(cand['id'])
        
        match_data['filled'] = intern['filled']
        allocations.append(match_data)
        
    for cand in candidates:
        if cand['id'] not in allocated_candidate_ids:
            pending.append({'candidate': cand, 'reason': 'No suitable matches or seats filled'})
            
    return allocations, pending