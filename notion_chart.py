from notion_client import Client
import pandas as pd
import json
from datetime import datetime, timedelta
import re
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Notion setup
notion_secret = os.getenv("NOTION_SECRET")
if not notion_secret:
    raise ValueError("NOTION_SECRET environment variable is not set. Please check your .env file.")
notion = Client(auth=notion_secret)

# Database IDs
TASKS_DB_ID = "294fd573-fcec-815a-bf2d-cc6d478b6be4"
MEASURES_DB_ID = "294fd573-fcec-808e-b0b2-c3cbc36c998d"

# Task categories
GYM_TASKS = ["👟 Workout", "💊 Nutrition/supplements"]
BUSINESS_TASKS = ["Work on project 1 hours a day", "Learn/explore new AI tools 30 min/day, 5 days/week", 
                  "Post on Twitter", "Short workout"]

# ============================================================================
# PART 1: GATHER AND TRANSFORM DATA
# ============================================================================

def get_property_value(prop_obj):
    """Extract value from Notion property"""
    prop_type = prop_obj.get("type")
    
    if prop_type == "title":
        return "".join([p.get("plain_text", "") for p in prop_obj.get("title", [])])
    elif prop_type == "rich_text":
        return "".join([p.get("plain_text", "") for p in prop_obj.get("rich_text", [])])
    elif prop_type == "number":
        return prop_obj.get("number")
    elif prop_type == "select":
        sel = prop_obj.get("select")
        return sel.get("name") if sel else None
    elif prop_type == "checkbox":
        return prop_obj.get("checkbox")
    elif prop_type == "status":
        st = prop_obj.get("status")
        return st.get("name") if st else None
    elif prop_type == "formula":
        f = prop_obj.get("formula")
        return f.get(f.get("type")) if f else None
    return None

def clean_name(name):
    """Remove duplicate indicators from names"""
    name = re.sub(r'\s*\(\d+\)\s*$', '', str(name))
    name = re.sub(r'_+\d+\s*$', '', str(name))
    return name.strip()

def fetch_all_pages(database_id):
    """Fetch all pages from a Notion database"""
    all_pages = []
    start_cursor = None
    
    while True:
        if start_cursor:
            response = notion.databases.query(database_id=database_id, start_cursor=start_cursor)
        else:
            response = notion.databases.query(database_id=database_id)
        
        all_pages.extend(response.get("results", []))
        if not response.get("has_more"):
            break
        start_cursor = response.get("next_cursor")
    
    return all_pages

def get_week_start_date(week_number):
    """Calculate Monday date for a week number"""
    week1_monday = datetime(2025, 10, 27)
    return week1_monday + timedelta(weeks=int(week_number) - 1)

def get_tasks_data():
    """Fetch and transform Tasks data to time series format"""
    print("Fetching Tasks data...")
    
    pages = fetch_all_pages(TASKS_DB_ID)
    rows = []
    
    day_mapping = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6
    }
    
    for page in pages:
        props = page.get("properties", {})
        
        task_name = clean_name(get_property_value(props.get("Name", {})))
        frequency = get_property_value(props.get("Frequency", {}))
        week_str = get_property_value(props.get("week", {}))
        
        # Extract week number
        week_num = None
        if week_str and "Week" in week_str:
            try:
                week_num = int(week_str.split()[-1])
            except:
                pass
        
        if week_num is None:
            continue
        
        week_start = get_week_start_date(week_num)
        
        # Process each day
        for day_name, day_offset in day_mapping.items():
            day_checkbox = props.get(day_name, {})
            completed = get_property_value(day_checkbox)
            
            if isinstance(completed, bool):
                date = (week_start + timedelta(days=day_offset)).date()
                
                rows.append({
                    "Date": date,
                    "Task_Name": task_name,
                    "Frequency": frequency,
                    "Week_Number": week_num,
                    "Week": week_str,
                    "Completed": completed
                })
    
    df = pd.DataFrame(rows)
    return df.sort_values(["Date", "Task_Name"]).reset_index(drop=True)

def get_measures_data():
    """Fetch Measures data (only rows with Description)"""
    print("Fetching Measures data...")
    
    pages = fetch_all_pages(MEASURES_DB_ID)
    rows = []
    
    for page in pages:
        props = page.get("properties", {})
        
        description = get_property_value(props.get("Description", {}))
        if not description:
            continue
        
        name = clean_name(get_property_value(props.get("Name", {})))
        week_str = get_property_value(props.get("Week", {}))
        score = get_property_value(props.get("Score", {}))
        
        # Extract week number
        week_num = None
        if week_str and "Week" in week_str:
            try:
                week_num = int(week_str.split()[-1])
            except:
                pass
        
        if week_num is None:
            continue
        
        rows.append({
            "Name": name,
            "Description": description,
            "Week_Number": week_num,
            "Week": week_str,
            "Score": score if score is not None else 0
        })
    
    return pd.DataFrame(rows)

# ============================================================================
# PART 2: CALCULATE DATA FOR CHARTS AND DISPLAY
# ============================================================================

def get_frequency_goal(frequency):
    """Convert frequency to numeric goal"""
    freq_lower = str(frequency).lower()
    
    if "daily" in freq_lower:
        return 7
    elif "times" in freq_lower:
        match = re.search(r'(\d+)', frequency)
        if match:
            return int(match.group(1))
    return None

def calculate_category_scores(tasks_df):
    """Calculate average scores per category per week"""
    scores = []
    
    for task_name in tasks_df['Task_Name'].unique():
        task_df = tasks_df[tasks_df['Task_Name'] == task_name]
        
        # Determine category
        category = None
        if task_name in GYM_TASKS:
            category = "Gym"
        elif task_name in BUSINESS_TASKS:
            category = "Business"
        
        if not category:
            continue
        
        frequency = task_df['Frequency'].iloc[0]
        goal = get_frequency_goal(frequency)
        
        if not goal:
            continue
        
        # Calculate score per week
        for week_num in task_df['Week_Number'].unique():
            week_df = task_df[task_df['Week_Number'] == week_num]
            completed = week_df['Completed'].sum()
            score = (completed / goal) * 100 if goal > 0 else 0
            
            scores.append({
                "Category": category,
                "Week_Number": week_num,
                "Week": f"Week {week_num}",
                "Score": score
            })
    
    # Average scores per category per week
    scores_df = pd.DataFrame(scores)
    category_scores = []
    
    for category in ["Gym", "Business"]:
        cat_df = scores_df[scores_df['Category'] == category]
        for week_num in sorted(cat_df['Week_Number'].unique()):
            week_df = cat_df[cat_df['Week_Number'] == week_num]
            if len(week_df) > 0:
                category_scores.append({
                    "Category": category,
                    "Week_Number": week_num,
                    "Week": f"Week {week_num}",
                    "Score": week_df['Score'].mean()
                })
    
    return pd.DataFrame(category_scores)

def save_combined_chart_data(category_scores_df, measures_df, output_dir="data"):
    """Save combined chart data as JSON"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Average multiple measures per week/category
    if not measures_df.empty:
        measures_df = measures_df.groupby(['Description', 'Week_Number', 'Week']).agg({
            'Score': 'mean',
            'Name': 'first'  # Keep first name for reference
        }).reset_index()
    
    # Get all data
    gym_scores = category_scores_df[category_scores_df['Category'] == 'Gym'].copy()
    business_scores = category_scores_df[category_scores_df['Category'] == 'Business'].copy()
    gym_measures = measures_df[measures_df['Description'] == 'Gym'].copy()
    business_measures = measures_df[measures_df['Description'] == 'Business'].copy()
    
    if gym_scores.empty and business_scores.empty:
        print("No data to chart")
        return
    
    # Sort all by week number
    gym_scores = gym_scores.sort_values('Week_Number')
    business_scores = business_scores.sort_values('Week_Number')
    gym_measures = gym_measures.sort_values('Week_Number')
    business_measures = business_measures.sort_values('Week_Number')
    
    # Get all unique weeks
    all_weeks = sorted(set(gym_scores['Week_Number'].tolist() + business_scores['Week_Number'].tolist()))
    week_labels = [f'Week {w}' for w in all_weeks]
    
    # Create score arrays aligned with weeks
    gym_task_scores = []
    business_task_scores = []
    week_to_gym_score = dict(zip(gym_scores['Week_Number'], gym_scores['Score'])) if not gym_scores.empty else {}
    week_to_business_score = dict(zip(business_scores['Week_Number'], business_scores['Score'])) if not business_scores.empty else {}
    
    for week_num in all_weeks:
        gym_task_scores.append(float(week_to_gym_score[week_num]) if week_num in week_to_gym_score else None)
        business_task_scores.append(float(week_to_business_score[week_num]) if week_num in week_to_business_score else None)
    
    # Prepare JSON data
    chart_data = {
        "weeks": week_labels,
        "gymTaskScores": gym_task_scores,
        "businessTaskScores": business_task_scores,
        "gymMeasures": [{"week": row['Week'], "score": float(row['Score'])} for _, row in gym_measures.iterrows()],
        "businessMeasures": [{"week": row['Week'], "score": float(row['Score'])} for _, row in business_measures.iterrows()]
    }
    
    # Save to JSON
    json_path = os.path.join(output_dir, "combined-chart-data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(chart_data, f, indent=2)
    
    print(f"✓ Created: {json_path}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def calculate_daily_category_scores(tasks_df):
    """Calculate cumulative category scores per day"""
    # Task categories mapping
    gym_tasks = GYM_TASKS
    business_tasks = BUSINESS_TASKS
    
    daily_scores = []
    
    for category, task_list in [("Gym", gym_tasks), ("Business", business_tasks)]:
        category_df = tasks_df[tasks_df['Task_Name'].isin(task_list)].copy()
        
        if category_df.empty:
            continue
        
        # Get all unique dates and weeks
        for week_num in sorted(category_df['Week_Number'].unique()):
            week_df = category_df[category_df['Week_Number'] == week_num]
            
            # Get frequency goals for each task
            task_goals = {}
            for task_name in week_df['Task_Name'].unique():
                task_freq_df = week_df[week_df['Task_Name'] == task_name]
                frequency = task_freq_df['Frequency'].iloc[0]
                goal = get_frequency_goal(frequency)
                if goal:
                    task_goals[task_name] = goal
            
            # Calculate cumulative score for each day
            for day_offset in range(7):  # Monday to Sunday
                date = get_week_start_date(week_num) + timedelta(days=day_offset)
                day_name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day_offset]
                
                # Get all rows up to and including this day
                up_to_date_df = week_df[week_df['Date'] <= date.date()]
                
                # Calculate score for each task
                task_scores = []
                for task_name in week_df['Task_Name'].unique():
                    if task_name not in task_goals:
                        continue
                    goal = task_goals[task_name]
                    task_day_df = up_to_date_df[up_to_date_df['Task_Name'] == task_name]
                    completed = task_day_df['Completed'].sum()
                    score = (completed / goal) * 100 if goal > 0 else 0
                    task_scores.append(score)
                
                if task_scores:
                    avg_score = sum(task_scores) / len(task_scores)
                    daily_scores.append({
                        "Category": category,
                        "Week_Number": week_num,
                        "Date": date.date(),
                        "Day_Name": day_name,
                        "Day_Offset": day_offset,
                        "Score": avg_score
                    })
    
    return pd.DataFrame(daily_scores)

def save_daily_chart_data(daily_scores_df, measures_df, output_dir="data"):
    """Save daily chart data as JSON"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Average multiple measures per week/category
    if not measures_df.empty:
        measures_df = measures_df.groupby(['Description', 'Week_Number', 'Week']).agg({
            'Score': 'mean',
            'Name': 'first'
        }).reset_index()
    
    # Get all unique weeks
    all_weeks = sorted([int(w) for w in daily_scores_df['Week_Number'].unique()])
    
    daily_charts_data = {}
    
    for week_num in all_weeks:
        week_daily = daily_scores_df[daily_scores_df['Week_Number'] == week_num].copy()
        
        if week_daily.empty:
            continue
        
        week_daily = week_daily.sort_values('Day_Offset')
        
        # Prepare data for this week
        week_data = {
            "weekNumber": int(week_num),
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "gymScores": [],
            "businessScores": []
        }
        
        # Get Gym and Business scores
        for category in ["Gym", "Business"]:
            cat_daily = week_daily[week_daily['Category'] == category]
            if not cat_daily.empty:
                scores = [0.0] * 7
                for _, row in cat_daily.iterrows():
                    day_offset = int(row['Day_Offset'])
                    scores[day_offset] = float(row['Score'])
                
                if category == "Gym":
                    week_data["gymScores"] = scores
                else:
                    week_data["businessScores"] = scores
        
        # Add measure scores
        gym_measures = measures_df[(measures_df['Description'] == 'Gym') & 
                                   (measures_df['Week_Number'] == week_num)]
        business_measures = measures_df[(measures_df['Description'] == 'Business') & 
                                       (measures_df['Week_Number'] == week_num)]
        
        week_data["gymMeasureScore"] = float(gym_measures['Score'].iloc[0]) if not gym_measures.empty else None
        week_data["businessMeasureScore"] = float(business_measures['Score'].iloc[0]) if not business_measures.empty else None
        
        daily_charts_data[f"week_{week_num}"] = week_data
    
    # Save all daily charts data
    json_path = os.path.join(output_dir, "daily-charts-data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(daily_charts_data, f, indent=2)
    
    print(f"✓ Created: {json_path}")

def calculate_individual_task_scores(tasks_df):
    """Calculate daily scores for each individual task"""
    all_tasks = sorted(tasks_df['Task_Name'].unique())
    task_data = {}
    
    for task_name in all_tasks:
        task_df = tasks_df[tasks_df['Task_Name'] == task_name].copy()
        
        if task_df.empty:
            continue
        
        # Get frequency goal
        frequency = task_df['Frequency'].iloc[0]
        goal = get_frequency_goal(frequency)
        
        if not goal:
            continue
        
        task_weeks_data = {}
        
        # Process each week
        for week_num in sorted(task_df['Week_Number'].unique()):
            week_df = task_df[task_df['Week_Number'] == week_num].copy()
            week_df = week_df.sort_values('Date')
            
            # Calculate cumulative score for each day
            daily_scores = []
            completed_count = 0
            
            for day_offset in range(7):  # Monday to Sunday
                date = get_week_start_date(week_num) + timedelta(days=day_offset)
                day_df = week_df[week_df['Date'] == date.date()]
                
                if not day_df.empty:
                    completed_count += day_df['Completed'].sum()
                
                score = (completed_count / goal) * 100 if goal > 0 else 0
                daily_scores.append(float(score))
            
            task_weeks_data[f"week_{week_num}"] = {
                "weekNumber": int(week_num),
                "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "scores": daily_scores,
                "goal": goal,
                "frequency": frequency
            }
        
        task_data[task_name] = task_weeks_data
    
    return task_data

def save_individual_tasks_data(tasks_df, output_dir="data"):
    """Save individual task data as JSON"""
    os.makedirs(output_dir, exist_ok=True)
    
    task_data = calculate_individual_task_scores(tasks_df)
    
    # Save to JSON
    json_path = os.path.join(output_dir, "individual-tasks-data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(task_data, f, indent=2)
    
    print(f"✓ Created: {json_path}")

if __name__ == "__main__":
    # Part 1: Gather and transform data
    print("=" * 80)
    print("PART 1: GATHERING AND TRANSFORMING DATA")
    print("=" * 80)
    tasks_df = get_tasks_data()
    measures_df = get_measures_data()
    
    print(f"\nTasks: {len(tasks_df)} rows")
    print(f"Measures: {len(measures_df)} rows")
    
    # Part 2: Calculate and save chart data as JSON
    print("\n" + "=" * 80)
    print("PART 2: CALCULATING SCORES AND SAVING JSON DATA")
    print("=" * 80)
    category_scores_df = calculate_category_scores(tasks_df)
    save_combined_chart_data(category_scores_df, measures_df)
    
    # Create daily charts data
    print("\nCreating daily charts data...")
    daily_scores_df = calculate_daily_category_scores(tasks_df)
    save_daily_chart_data(daily_scores_df, measures_df)
    
    # Create individual tasks data
    print("\nCreating individual tasks data...")
    save_individual_tasks_data(tasks_df)
    
    print("\nDone!")
