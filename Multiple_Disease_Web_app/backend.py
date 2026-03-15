import os
import pickle
import numpy as np
import google.generativeai as genai
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from fpdf import FPDF
import io
import datetime

# --- Initialization ---
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# --- Configure Gemini API ---
# IMPORTANT: Replace "YOUR_GEMINI_API_KEY" with your actual key
# For better security, use environment variables in a real application
try:
    genai.configure(api_key="AIzaSyDGf0yS2u0bzTKP-qEK8dcCz79a-X-aMwA") 
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    gemini_model = None


# --- Load Machine Learning Models ---
def load_model(path):
    try:
        with open(path, 'rb') as file:
            return pickle.load(file)
    except Exception as e:
        print(f"Error loading model {path}: {e}")
        return None

diabetes_model = load_model('models/trained_model_diab.sav')
heart_disease_model = load_model('models/trained_model_heart.sav')
parkinsons_model = load_model('models/trained_model_par.sav')

# --- Normal Value Ranges for Comparison Charts ---
# These are illustrative. Use clinically accurate ranges for a real application.
normal_ranges = {
    'diabetes': {
        'Pregnancies': {'min': 0, 'max': 6, 'avg': 3},
        'Glucose': {'min': 70, 'max': 100, 'avg': 85},
        'BloodPressure': {'min': 60, 'max': 80, 'avg': 70},
        'SkinThickness': {'min': 10, 'max': 30, 'avg': 20},
        'Insulin': {'min': 2, 'max': 25, 'avg': 15},
        'BMI': {'min': 18.5, 'max': 24.9, 'avg': 22},
        'DiabetesPedigreeFunction': {'min': 0.1, 'max': 0.5, 'avg': 0.3},
        'Age': {'min': 20, 'max': 50, 'avg': 33}
    },
    'heart': {
        'age': {'min': 20, 'max': 80, 'avg': 54},
        'sex': {'min': 0, 'max': 1, 'avg': 0.68}, # Not a range, but for consistency
        'cp': {'min': 0, 'max': 3, 'avg': 1},
        'trestbps': {'min': 90, 'max': 120, 'avg': 110},
        'chol': {'min': 150, 'max': 200, 'avg': 175},
        'fbs': {'min': 0, 'max': 0, 'avg': 0},
        'restecg': {'min': 0, 'max': 1, 'avg': 0.5},
        'thalach': {'min': 100, 'max': 160, 'avg': 130},
        'exang': {'min': 0, 'max': 0, 'avg': 0},
        'oldpeak': {'min': 0, 'max': 1, 'avg': 0.5},
        'slope': {'min': 1, 'max': 2, 'avg': 1.5},
        'ca': {'min': 0, 'max': 1, 'avg': 0.5},
        'thal': {'min': 0, 'max': 2, 'avg': 1}
    },
    'parkinsons': {
        'fo': {'min': 110, 'max': 180, 'avg': 150},
        'fhi': {'min': 120, 'max': 200, 'avg': 160},
        'flo': {'min': 80, 'max': 110, 'avg': 95},
        'Jitter_percent': {'min': 0.002, 'max': 0.006, 'avg': 0.004},
        'Jitter_Abs': {'min': 0.00001, 'max': 0.00005, 'avg': 0.00003},
        'RAP': {'min': 0.001, 'max': 0.003, 'avg': 0.002},
        'PPQ': {'min': 0.001, 'max': 0.004, 'avg': 0.0025},
        'DDP': {'min': 0.003, 'max': 0.01, 'avg': 0.006},
        'Shimmer': {'min': 0.01, 'max': 0.03, 'avg': 0.02},
        'Shimmer_dB': {'min': 0.1, 'max': 0.3, 'avg': 0.2},
        'APQ3': {'min': 0.005, 'max': 0.015, 'avg': 0.01},
        'APQ5': {'min': 0.007, 'max': 0.02, 'avg': 0.013},
        'APQ': {'min': 0.01, 'max': 0.03, 'avg': 0.02},
        'DDA': {'min': 0.015, 'max': 0.045, 'avg': 0.03},
        'NHR': {'min': 0.005, 'max': 0.025, 'avg': 0.015},
        'HNR': {'min': 20, 'max': 30, 'avg': 25},
        'RPDE': {'min': 0.4, 'max': 0.6, 'avg': 0.5},
        'DFA': {'min': 0.6, 'max': 0.8, 'avg': 0.7},
        'spread1': {'min': -7, 'max': -5, 'avg': -6},
        'spread2': {'min': 0.1, 'max': 0.3, 'avg': 0.2},
        'D2': {'min': 1.8, 'max': 2.8, 'avg': 2.3},
        'PPE': {'min': 0.1, 'max': 0.3, 'avg': 0.2}
    }
}


# --- PDF Generation Class (Overhauled) ---
class ReportPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(34, 47, 62)
        self.cell(0, 10, '🧑‍⚕️ Health Assistant AI Report', 0, 1, 'L')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(128)
        self.cell(0, 7, f"Report Generated: {datetime.datetime.now().strftime('%B %d, %Y %I:%M %p')}", 0, 1, 'L')
        self.line(10, 30, 200, 30)
        self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(180, 0, 0)
        disclaimer = "Disclaimer: This AI-generated report is for informational purposes only and is not a substitute for professional medical advice. Please consult a qualified healthcare provider."
        self.multi_cell(0, 4, disclaimer, 0, 'C')
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_fill_color(240, 245, 250)
        self.set_text_color(45, 52, 54)
        self.cell(0, 10, f'  {title}', 0, 1, 'L', 1)
        self.ln(5)

    def section_body(self, body):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(80)
        # FPDF requires latin-1 encoding, so we replace unsupported characters
        clean_body = body.encode('latin-1', 'replace').decode('latin-1')
        self.multi_cell(0, 7, clean_body)
        self.ln()

    def result_summary(self, diagnosis, risk_score, risk_category):
        self.section_title("Prediction Summary")
        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Diagnosis:')
        self.set_font('Helvetica', '', 12)
        self.cell(0, 8, diagnosis, 0, 1)

        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Risk Score:')
        self.set_font('Helvetica', '', 12)
        self.cell(0, 8, f"{risk_score} / 100", 0, 1)

        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Risk Category:')
        self.set_font('Helvetica', '', 12)
        
        # Color code the category
        if risk_category == 'Low Risk': self.set_text_color(34, 139, 34)
        elif risk_category == 'Moderate Risk': self.set_text_color(255, 165, 0)
        else: self.set_text_color(220, 20, 60)
            
        self.cell(0, 8, risk_category, 0, 1)
        self.set_text_color(80) # Reset color
        self.ln(5)

    def input_data_table(self, inputs):
        self.section_title("Your Submitted Data")
        self.set_font('Helvetica', 'B', 10)
        self.set_fill_color(220, 220, 220)
        self.cell(95, 8, 'Parameter', 1, 0, 'C', 1)
        self.cell(95, 8, 'Your Value', 1, 1, 'C', 1)
        self.set_font('Helvetica', '', 10)
        
        fill = False
        self.set_fill_color(247, 247, 247)
        for key, value in inputs.items():
            self.cell(95, 8, key.replace('_', ' ').title(), 1, 0, 'L', fill)
            self.cell(95, 8, str(value), 1, 1, 'C', fill)
            fill = not fill
        self.ln(5)

# --- Helper Functions ---
def get_risk_category(score):
    if score < 40: return 'Low Risk'
    elif 40 <= score < 70: return 'Moderate Risk'
    else: return 'High Risk'

# --- API Endpoints ---

@app.route('/predict/<disease_name>', methods=['POST'])
def predict_disease(disease_name):
    models = {
        'diabetes': {'model': diabetes_model, 'diag_pos': 'High indication of Diabetes', 'diag_neg': 'Low indication of Diabetes'},
        'heart': {'model': heart_disease_model, 'diag_pos': 'High risk of Heart Disease', 'diag_neg': 'Low risk of Heart Disease'},
        'parkinsons': {'model': parkinsons_model, 'diag_pos': "Strong indicators of Parkinson's Disease", 'diag_neg': "Low indicators of Parkinson's Disease"}
    }
    
    if disease_name not in models:
        return jsonify({'error': 'Invalid disease name'}), 400

    config = models[disease_name]
    data = request.get_json()
    features = [float(data[key]) for key in data.keys()]
    
    prediction = config['model'].predict([features])[0]
    
    # Example risk score - can be made more sophisticated
    score = np.random.randint(65, 98) if prediction == 1 else np.random.randint(5, 35)

    return jsonify({
        'prediction': int(prediction),
        'diagnosis': config['diag_pos'] if prediction == 1 else config['diag_neg'],
        'risk_score': score,
        'risk_category': get_risk_category(score),
        'normal_ranges': normal_ranges.get(disease_name, {})
    })

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    if not gemini_model:
        return jsonify({'plan': "Gemini AI is not available. Please check the API key in the backend."})

    data = request.get_json()
    disease_type = data.get('disease_type')
    user_inputs = data.get('inputs')
    prediction = data.get('prediction')

    # Shared instruction for all prompts
    base_instruction = "IMPORTANT: Structure the response using markdown. Use '###' for main headings. For any lists of principles or tips, you MUST use bullet points starting with '*'. For any meal plans, exercise schedules, or daily routines, you MUST use a markdown table with clear headers. **Highlight** key terms using double asterisks."

    if prediction == 1:  # High-risk, corrective plan
        prompt_template = {
            'diabetes': f"As a health expert, create a supportive wellness plan for a person with a high risk of diabetes based on their data: {user_inputs}. {base_instruction}\n\n### Key Dietary Principles\n* [Provide a key principle, **highlighting** a key term.]\n* [Provide another principle...]\n\n### Sample 3-Day Meal Plan\n[Create a markdown table with columns: Day, Breakfast, Lunch, Dinner, Snacks]\n\n### Recommended Physical Activities\n[Create a markdown table with columns: Day, Activity, Duration, Intensity]",
            'heart': f"As a cardiac specialist, design a safe weekly plan for an individual at high risk for heart disease based on their data: {user_inputs}. {base_instruction}\n\n### Core Focus Areas\n* [Provide a key focus area, **highlighting** a key term.]\n* [Provide another focus area...]\n\n### Sample Weekly Exercise Schedule\n[Create a markdown table with columns: Day, Activity, Duration, Notes (e.g., Warm-up/Cool-down)]\n\n### Heart-Healthy Nutrition Guide\n* [Provide a key dietary tip...]\n* [Provide another tip...]",
            'parkinsons': f"As an occupational therapist, create a structured daily routine for a person with Parkinson's based on their data: {user_inputs}. {base_instruction}\n\n### Goals of This Routine\n* [Provide a key goal, **highlighting** a key term.]\n* [Provide another goal...]\n\n### Daily Structured Timetable\n[Create a markdown table with columns: Time Slot, Activity, Purpose/Notes]\n\n### Tips for Success\n* [Provide a tip...]\n* [Provide another tip...]"
        }
    else:  # Low-risk, wellness/preventative plan
        prompt_template = {
            'diabetes': f"As a wellness coach, create a proactive lifestyle plan for a low-risk individual to prevent diabetes, based on their data: {user_inputs}. {base_instruction}\n\n### Nutrition Tips for Stable Energy\n* [Provide a key tip, **highlighting** a key term.]\n* [Provide another tip...]\n\n### Sample 3-Day Meal Ideas\n[Create a markdown table with columns: Day, Breakfast, Lunch, Dinner]\n\n### Fun Ways to Stay Active\n* [Provide a suggestion...]\n* [Provide another suggestion...]",
            'heart': f"As a fitness expert, devise a proactive wellness plan for a low-risk individual to maintain a strong heart, based on their data: {user_inputs}. {base_instruction}\n\n### Heart-Healthy Eating Habits\n* [Provide a key habit, **highlighting** a key term.]\n* [Provide another habit...]\n\n### Sample Weekly Fitness Routine\n[Create a markdown table with columns: Day, Focus (e.g., Cardio, Strength), Suggested Activity, Duration]\n\n### Stress Management Techniques\n* [Provide a technique...]\n* [Provide another technique...]",
            'parkinsons': f"As a brain health specialist, provide a proactive plan for a low-risk individual to support neurological health, based on their data: {user_inputs}. {base_instruction}\n\n### Pillars of Brain Health\n* [Provide a key pillar, **highlighting** a key term.]\n* [Provide another pillar...]\n\n### Weekly Cognitive & Physical Plan\n[Create a markdown table with columns: Day, Physical Activity, Cognitive Exercise, Nutrition Focus]\n\n### Long-term Habits\n* [Provide a habit...]\n* [Provide another habit...]"
        }

    try:
        prompt = prompt_template.get(disease_type, "Create a generic health plan.")
        response = gemini_model.generate_content(prompt)
        return jsonify({'plan': response.text})
    except Exception as e:
        return jsonify({'plan': f"Error generating plan from AI model: {e}"})


@app.route('/generate-pdf', methods=['POST'])
def generate_pdf_report():
    data = request.get_json()
    pdf = ReportPDF()
    pdf.add_page()
    
    # Summary
    pdf.result_summary(data['diagnosis'], data['risk_score'], data['risk_category'])
    
    # Input Data Table
    pdf.input_data_table(data['inputs'])

    # Personalized Plan
    if data.get('plan'):
        pdf.section_title("Personalized AI-Generated Plan")
        pdf.section_body(data['plan'])
    
    # Use BytesIO to create the PDF in memory
    pdf_buffer = io.BytesIO(pdf.output(dest='S').encode('latin-1'))
    pdf_buffer.seek(0)
    
    return send_file(pdf_buffer, as_attachment=True, download_name='Health_AI_Report.pdf', mimetype='application/pdf')

# --- Main Execution ---
if __name__ == '__main__':
    if all([diabetes_model, heart_disease_model, parkinsons_model]):
        app.run(debug=True)
    else:
        print("FATAL: Could not start the application because one or more machine learning models failed to load.")


         # new line a