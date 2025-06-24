# **App Name**: PII Protector

## Core Features:

- Data Ingestion: Allows users to upload files in various formats (.csv, .json, .txt, .docx, .xlsx) or connect to database snapshots using JSON samples and display data.
- PII Detection Engine: Utilizes an AI tool to scan uploaded data and highlight fields containing PII (Personally Identifiable Information) such as name, phone, email, address, SSN, etc.
- Result Visualization: Displays the raw data and highlighted PII fields in a side-by-side view, with tooltips or modals explaining why a field was flagged.
- Summary Panel: Provides a summary panel showing the number and types of PII entities detected, grouped by type (e.g., Email: 12, Names: 8, SSN: 3).
- JSON Output: Generates a sample JSON schema with PII classification, including column name, detected type, and confidence level.

## Style Guidelines:

- Primary color: Subtle light blue (#B4D4FF) to convey trust and security, reflecting Google Workspace's clean aesthetic.
- Background color: Light gray (#F5F7FA), near-white, creating a clean and modern backdrop.
- Accent color: Muted purple (#A38DBC) used for highlights and interactive elements.
- Font: 'Inter' (sans-serif) for both headings and body text, ensuring readability and a modern, neutral feel.
- Use Google's material design icon set with consistent styling to ensure clarity and usability.
- Emulate Google Workspace's clean layout with rounded containers, drop shadows, and subtle gradients for visual appeal.
- Subtle transitions and animations (e.g., fade-ins, smooth scrolling) to enhance user experience without being distracting.