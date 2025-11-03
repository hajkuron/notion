# Notion Chart Generator

This project connects to Notion, pulls data from tables, and creates charts that can be embedded back into Notion.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the project root with your Notion integration token:
```
NOTION_TOKEN=your_notion_integration_token_here
```

## Getting Your Notion Integration Token

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "Chart Generator")
4. Copy the "Internal Integration Token"
5. Add it to your `.env` file as `NOTION_TOKEN`

## Important: Grant Access to Databases

After creating the integration, you need to grant it access to your databases:

1. Open the Notion page/database you want to access
2. Click the "..." menu (top right)
3. Click "Connections"
4. Find your integration and connect it

## Usage

Run the script to see available tables:
```bash
python notion_chart.py
```

