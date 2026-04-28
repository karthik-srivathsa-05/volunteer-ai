"""
seed_data.py — Run ONCE before starting the app.
Usage: python seed_data.py

Populates the DB with 15 realistic Bengaluru-based volunteers
and 8 NGO tasks spanning education, health, environment, and legal aid.
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "volunteer.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, bio TEXT NOT NULL,
    skills TEXT DEFAULT '[]', availability TEXT NOT NULL,
    city TEXT DEFAULT 'Bengaluru', languages TEXT DEFAULT '["English"]',
    reliability_score REAL DEFAULT 5.0, total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    description TEXT NOT NULL, required_skills TEXT DEFAULT '[]',
    ngo_name TEXT NOT NULL, date TEXT NOT NULL, time_slot TEXT NOT NULL,
    slots_needed INTEGER DEFAULT 2, status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL, status TEXT DEFAULT 'pending',
    match_score INTEGER, match_reasoning TEXT, outreach_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
    UNIQUE(task_id, volunteer_id)
);
"""

VOLUNTEERS = [
    {
        "name": "Priya Raghavan",
        "email": "priya.r@gmail.com",
        "bio": "Senior software engineer at Infosys with 6 years of experience in Python, SQL, and data pipelines. I teach weekend coding bootcamps for underprivileged students and designed the curriculum for 3 STEM programs at government schools in North Bengaluru.",
        "skills": ["Python", "Data Analysis", "Teaching", "SQL", "Curriculum Design"],
        "availability": "Weekends",
        "languages": ["English", "Kannada", "Tamil"],
        "reliability_score": 9.2,
        "total_tasks": 12,
        "completed_tasks": 11,
    },
    {
        "name": "Dr. Arjun Mehta",
        "email": "arjun.mehta@gmail.com",
        "bio": "MBBS graduate completing residency at Manipal Hospital, specialising in community medicine. Certified first-aid trainer and have conducted 5 preventive health camps in rural Karnataka. Fluent in Hindi, English, and basic Kannada.",
        "skills": ["First Aid", "Health Education", "Medical Triage", "Community Health", "Patient Counseling"],
        "availability": "Sunday mornings",
        "languages": ["English", "Hindi", "Kannada"],
        "reliability_score": 8.8,
        "total_tasks": 8,
        "completed_tasks": 7,
    },
    {
        "name": "Meera Krishnamurthy",
        "email": "meera.k@yahoo.com",
        "bio": "Government school teacher with 14 years experience teaching Maths and Science to Class 6–10 students. Expert in Kannada-medium activity-based learning. Trained 200+ students in Science Olympiad preparation over 5 years.",
        "skills": ["Teaching", "Mathematics", "Science Education", "Kannada Literacy", "Activity Design"],
        "availability": "Weekends and school holidays",
        "languages": ["Kannada", "English", "Tamil"],
        "reliability_score": 9.7,
        "total_tasks": 20,
        "completed_tasks": 19,
    },
    {
        "name": "Ravi Prakash",
        "email": "raviprakash.design@gmail.com",
        "bio": "Freelance graphic designer and social media manager with NGO clients for 4 years. I create visual content, run Instagram/LinkedIn campaigns, and shoot event photography. Proficient in Canva, Figma, and Adobe Suite.",
        "skills": ["Graphic Design", "Social Media", "Photography", "Canva", "Content Creation", "Video Editing"],
        "availability": "Flexible weekdays and weekends",
        "languages": ["English", "Kannada", "Telugu"],
        "reliability_score": 7.5,
        "total_tasks": 6,
        "completed_tasks": 5,
    },
    {
        "name": "Ananya Singh",
        "email": "ananya.enviro@gmail.com",
        "bio": "MSc Environmental Science from IISc Bengaluru. Researching urban biodiversity and lake restoration in Bengaluru. Experienced in running community waste-audit workshops and environmental awareness drives for residential societies.",
        "skills": ["Environmental Science", "Conservation", "Waste Management", "Community Workshops", "Research", "Public Speaking"],
        "availability": "Weekends",
        "languages": ["English", "Hindi"],
        "reliability_score": 8.0,
        "total_tasks": 5,
        "completed_tasks": 4,
    },
    {
        "name": "Karthik Balan",
        "email": "karthik.b.nair@gmail.com",
        "bio": "Civil engineer with a construction firm managing 50+ person teams on infrastructure projects. I volunteer for habitat restoration and community construction initiatives — site logistics, materials planning, and team coordination are my core skills.",
        "skills": ["Civil Engineering", "Project Management", "Logistics", "Team Coordination", "Site Management"],
        "availability": "Saturday afternoons",
        "languages": ["Malayalam", "English", "Kannada"],
        "reliability_score": 8.5,
        "total_tasks": 10,
        "completed_tasks": 8,
    },
    {
        "name": "Divya Subramaniam",
        "email": "divya.sub@gmail.com",
        "bio": "Social worker with 8 years of field experience at Namma Bengaluru Foundation, working with urban slum communities. I run women's self-help groups, child welfare programs, and handle community mediation. Expert in Kannada-medium community engagement.",
        "skills": ["Social Work", "Community Outreach", "Women Empowerment", "Child Welfare", "Counseling", "Kannada Communication"],
        "availability": "Monday to Saturday, daytime",
        "languages": ["Kannada", "Tamil", "English"],
        "reliability_score": 9.5,
        "total_tasks": 35,
        "completed_tasks": 33,
    },
    {
        "name": "Rahul Joshi",
        "email": "rahul.joshi.ds@gmail.com",
        "bio": "Data scientist at a health-tech startup working with Python, Pandas, and statistical forecasting. Looking to apply data skills in the social sector — especially for program impact measurement and beneficiary data analysis for NGO donor reporting.",
        "skills": ["Python", "Data Science", "Statistical Analysis", "Machine Learning", "Excel", "Report Writing"],
        "availability": "Weekends",
        "languages": ["English", "Hindi", "Marathi"],
        "reliability_score": 6.0,
        "total_tasks": 3,
        "completed_tasks": 2,
    },
    {
        "name": "Sunita Bhatia",
        "email": "sunita.nut@gmail.com",
        "bio": "Registered Dietitian and Nutritionist running a community nutrition clinic in Rajajinagar. I conduct free workshops on maternal nutrition, child feeding, and diabetes management for low-income families. Fluent Hindi communicator.",
        "skills": ["Nutrition", "Health Education", "Cooking Demonstrations", "Community Health", "Workshop Facilitation"],
        "availability": "Weekend mornings",
        "languages": ["Hindi", "English", "Punjabi"],
        "reliability_score": 9.0,
        "total_tasks": 15,
        "completed_tasks": 13,
    },
    {
        "name": "Akash Reddy",
        "email": "akash.r.creative@gmail.com",
        "bio": "UX designer and digital illustrator. I create infographics, explainer videos, and accessible digital content. Previously designed learning materials for Pratham Books and Teach for India. Specialise in making complex information visually clear.",
        "skills": ["UX Design", "Illustration", "Infographic Design", "Video Editing", "Accessibility Design", "Figma"],
        "availability": "Evenings and weekends",
        "languages": ["Telugu", "English", "Kannada"],
        "reliability_score": 8.2,
        "total_tasks": 7,
        "completed_tasks": 6,
    },
    {
        "name": "Fatima Sheikh",
        "email": "fatima.s.law@gmail.com",
        "bio": "Advocate at the High Court of Karnataka providing pro-bono legal aid to domestic violence survivors and migrant workers. Experienced in document drafting, rights education workshops, and legal literacy programs in Hindi, Urdu, and Kannada.",
        "skills": ["Legal Aid", "Document Drafting", "Rights Education", "Advocacy", "Counseling", "Workshop Facilitation"],
        "availability": "Saturday mornings",
        "languages": ["Urdu", "Hindi", "English", "Kannada"],
        "reliability_score": 9.3,
        "total_tasks": 18,
        "completed_tasks": 17,
    },
    {
        "name": "Samuel Thomas",
        "email": "samuel.t.photo@gmail.com",
        "bio": "Photojournalist and documentary filmmaker who has covered social impact stories across South India for regional publications. Available for NGO event documentation, fundraising short films, and photography training for beneficiaries.",
        "skills": ["Photography", "Videography", "Documentary Filmmaking", "Storytelling", "Photo Editing", "Lightroom"],
        "availability": "Weekends",
        "languages": ["English", "Malayalam", "Tamil"],
        "reliability_score": 7.8,
        "total_tasks": 9,
        "completed_tasks": 7,
    },
    {
        "name": "Lakshmi Venkataraman",
        "email": "lakshmi.v.fin@gmail.com",
        "bio": "Chartered Accountant with 10 years in nonprofit accounting and FCRA compliance. I help NGOs set up financial management systems, prepare for statutory audits, and train staff on Tally and QuickBooks. Expert in CSR funding reporting.",
        "skills": ["Accounting", "Nonprofit Finance", "Tally", "QuickBooks", "FCRA Compliance", "Auditing"],
        "availability": "Weekends",
        "languages": ["Tamil", "English", "Kannada"],
        "reliability_score": 9.8,
        "total_tasks": 22,
        "completed_tasks": 22,
    },
    {
        "name": "Nikhil Sharma",
        "email": "nikhil.sharma.pe@gmail.com",
        "bio": "Physical education teacher and certified yoga instructor. I run after-school sports programs in government schools and coach football, kabaddi, and kho-kho. Also trained in youth mental wellness facilitation. Strong classroom presence.",
        "skills": ["Physical Education", "Sports Coaching", "Yoga", "Youth Programs", "Mental Wellness", "Team Building"],
        "availability": "Evenings and Sundays",
        "languages": ["Hindi", "English", "Kannada"],
        "reliability_score": 8.7,
        "total_tasks": 14,
        "completed_tasks": 12,
    },
    {
        "name": "Chitra Nagaraj",
        "email": "chitra.nagaraj@gmail.com",
        "bio": "HR Manager at a Bengaluru tech firm specialising in training program design, behavioural interviewing, and career development. Keen to help youth from under-resourced communities enter the formal job market through resume, interview, and soft-skills workshops.",
        "skills": ["HR", "Resume Building", "Interview Coaching", "Training Design", "Career Counseling", "Soft Skills"],
        "availability": "Weekends",
        "languages": ["Kannada", "English", "Telugu"],
        "reliability_score": 8.1,
        "total_tasks": 8,
        "completed_tasks": 7,
    },
]

TASKS = [
    {
        "title": "Python Workshop — Govt School Students",
        "description": "Conduct a 3-hour hands-on Python programming workshop for Class 9-10 students at a government school in Yelahanka. No prior knowledge assumed; laptops provided. Focus on fun, real-world projects.",
        "required_skills": ["Python", "Teaching", "Student Engagement"],
        "ngo_name": "Agastya International Foundation",
        "date": "2025-08-03",
        "time_slot": "10:00 AM – 1:00 PM",
        "slots_needed": 3,
    },
    {
        "title": "Weekend Animal Shelter Care",
        "description": "Support CUPA's Hennur shelter staff with feeding, cleaning enclosures, and socialising rescued dogs. No experience needed — patience and compassion are the only requirements.",
        "required_skills": ["Animal Care", "Physical Stamina", "Reliability"],
        "ngo_name": "CUPA Bengaluru",
        "date": "2025-08-10",
        "time_slot": "8:00 AM – 12:00 PM",
        "slots_needed": 4,
    },
    {
        "title": "Digital Literacy Training for Women",
        "description": "Teach basic smartphone skills — WhatsApp, Google Pay, online safety — to 20 women from the Shivajinagar community. Must be able to communicate in Kannada or Hindi.",
        "required_skills": ["Digital Literacy", "Teaching", "Kannada or Hindi"],
        "ngo_name": "Digital Empowerment Foundation",
        "date": "2025-08-17",
        "time_slot": "11:00 AM – 2:00 PM",
        "slots_needed": 2,
    },
    {
        "title": "Impact Data Analysis — Skilling Program",
        "description": "Clean and analyse 6 months of beneficiary data in Python or Excel. Produce a concise 1-page outcome summary for donor reporting. Remote-friendly task; dataset will be shared securely.",
        "required_skills": ["Data Analysis", "Python or Excel", "Report Writing"],
        "ngo_name": "The/Nudge Foundation",
        "date": "2025-08-20",
        "time_slot": "Flexible (remote)",
        "slots_needed": 1,
    },
    {
        "title": "Lake Restoration Awareness Drive",
        "description": "Join the Bellandur lake restoration team for a community awareness walk. Speak with residents about waste segregation and lake health; help set up information stalls and distribute materials.",
        "required_skills": ["Environmental Awareness", "Public Communication", "Kannada preferred"],
        "ngo_name": "Hasiru Dala",
        "date": "2025-08-24",
        "time_slot": "7:00 AM – 10:00 AM",
        "slots_needed": 5,
    },
    {
        "title": "NGO Social Media & Content Setup",
        "description": "Set up Marpu Foundation's Instagram and LinkedIn presence. Create 10 branded post templates, write bio copy, and schedule the first month of content. One-time project, remote-friendly.",
        "required_skills": ["Social Media", "Graphic Design", "Copywriting"],
        "ngo_name": "Marpu Foundation",
        "date": "2025-08-15",
        "time_slot": "Flexible",
        "slots_needed": 1,
    },
    {
        "title": "Pro-Bono Legal Clinic — Migrant Workers",
        "description": "Provide basic legal guidance to migrant construction workers on wage disputes, document rights, and access to government schemes. Hindi and English fluency required; experience in labour law preferred.",
        "required_skills": ["Legal Knowledge", "Hindi", "Rights Education", "Documentation"],
        "ngo_name": "Samara Legal Aid",
        "date": "2025-08-31",
        "time_slot": "9:00 AM – 12:00 PM",
        "slots_needed": 2,
    },
    {
        "title": "Sports Day Coaching — Primary School",
        "description": "Help organise and coach kabaddi, kho-kho, and relay races for 80 students at a government primary school in Jayanagar. High energy and enthusiasm required — this is a full Sports Day event.",
        "required_skills": ["Sports Coaching", "Youth Programs", "Physical Fitness"],
        "ngo_name": "Parikrma Humanity Foundation",
        "date": "2025-09-06",
        "time_slot": "8:00 AM – 1:00 PM",
        "slots_needed": 3,
    },
]

def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)

    # Clear existing seed data
    conn.execute("DELETE FROM assignments")
    conn.execute("DELETE FROM tasks")
    conn.execute("DELETE FROM volunteers")

    for v in VOLUNTEERS:
        conn.execute(
            """INSERT OR IGNORE INTO volunteers
               (name,email,bio,skills,availability,city,languages,reliability_score,total_tasks,completed_tasks)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                v["name"], v["email"], v["bio"],
                json.dumps(v["skills"]), v["availability"],
                "Bengaluru", json.dumps(v["languages"]),
                v["reliability_score"], v["total_tasks"], v["completed_tasks"],
            ),
        )

    for t in TASKS:
        conn.execute(
            """INSERT INTO tasks (title,description,required_skills,ngo_name,date,time_slot,slots_needed)
               VALUES (?,?,?,?,?,?,?)""",
            (
                t["title"], t["description"],
                json.dumps(t["required_skills"]),
                t["ngo_name"], t["date"], t["time_slot"], t["slots_needed"],
            ),
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(VOLUNTEERS)} volunteers and {len(TASKS)} tasks into {DB_PATH}")

if __name__ == "__main__":
    seed()

