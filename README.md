# PM Internship Scheme - AI Allocation Engine

An AI-powered Smart Allocation Engine for the PM Internship Scheme. The system matches candidates to internships using a weighted scoring model, allocates seats fairly under capacity constraints, and explains every decision.

## Overview

The platform connects students and employers. Students apply with their profile, employers post internship openings, and the AI engine scores every candidate-internship pair and produces a fair, transparent allocation.

All data is stored in-memory for fast demonstration. The matching and allocation logic is decoupled from storage, so it can be connected to a real database without changing the core engine.

## Features

### Dashboard
- Summary statistics: total candidates, internships, available seats, successful allocations, average match score, allocation rate, and rural representation.
- Visual charts for sector distribution, allocation status, rural vs urban split, and match score distribution.

### Candidate Portal
- Students can submit an application with name, CGPA, qualification, skills, preferred sector, role, location, home state, and location type.
- Searchable and filterable candidate table.

### Employer Portal
- Employers can post internship openings with role, sector, location, required qualification, required skills, and capacity.
- Each internship displays a capacity progress bar showing filled vs total seats.

### AI Matching
- Computes a match score for a selected candidate across all available internships.
- Returns the top recommendations with a score breakdown and human-readable reasons.
- Supports single-candidate allocation with a full score explanation.

### Allocation Engine
- Runs a full allocation across all candidates and internships.
- Produces two lists: allocated candidates and pending candidates.
- Results can be exported as CSV.

### Analytics
- Capacity utilization per internship.
- State-wise allocation distribution.

## How the Allocation Works

The engine uses two stages.

### 1. Matching (Weighted Scoring)
Each candidate-internship pair is scored out of 100:

| Criterion | Weight |
|-----------|--------|
| Skills match | 35 |
| Qualification match | 20 |
| Role preference match | 20 |
| Sector preference match | 15 |
| Location preference match | 10 |

Policy adjustments are then applied:
- Rural priority bonus
- Previous participation penalty

### 2. Allocation (Greedy Optimization)
- All valid candidate-internship pairs above a minimum threshold are generated.
- Pairs are sorted by match score, with CGPA as the tie-breaker.
- Candidates are assigned greedily while respecting internship capacity.

Every match includes a breakdown and a list of reasons, making the decision auditable.

## Tech Stack

- Backend: Python, Flask
- Frontend: HTML, CSS, JavaScript
- Data Visualization: Chart.js
- Storage: In-memory

## Setup and Run

1. Install dependencies:
pip install -r backend/requirements.txt

2. Start the server:
python backend/app.py


3. Open `http://localhost:5000` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/candidates | List all candidates |
| GET | /api/internships | List all internships |
| POST | /api/apply | Register a new candidate |
| POST | /api/post_internship | Post a new internship |
| POST | /api/match | Get top matches for a candidate |
| POST | /api/allocate | Run full allocation |
| POST | /api/allocate_single | Allocate one candidate |
| GET | /api/allocations | Get allocation results |
| GET | /api/analytics | Get dashboard analytics |
| POST | /api/reset | Reset all data |
