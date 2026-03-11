# AganceOnline

A premium automotive dealership website featuring a modern, responsive design with dark/light mode, multi-language support (English/Arabic), and currency conversion (USD/EGP).

## Features

*   **Branding:** AganceOnline
*   **Theme:** Dark and Light mode toggle.
*   **Language:** English and Arabic (RTL support).
*   **Currency:** Toggle between USD ($) and EGP (L.E).
*   **Data Driven:** Products and inquiries are managed via Supabase.
*   **Responsive:** Fully responsive design using Tailwind CSS.
*   **Favorites:** Persist favorite vehicles across sessions.
*   **Inventory Filter:** Filter by category and search by name.
*   **Admin Dashboard:** Manage vehicles and customer inquiries.

## Supabase Setup

This project uses Supabase for the backend (Database & Auth).

## Admin Dashboard

The application includes a protected Admin Dashboard (`admin.html`) for managing content.

### Accessing the Dashboard
1.  Navigate to `admin.html`.
2.  Log in using the credentials created in the Supabase Authentication tab.

### Managing Vehicles
*   **View:** The "Products" tab lists all current vehicles.
*   **Add:** Click "Add Vehicle" to open the form. You can upload a main image and a gallery of images.
*   **Edit:** Click "Edit" on any vehicle row to modify its details.
*   **Delete:** Click "Delete" to remove a vehicle permanently.

### Managing Inquiries
*   **View:** The "Inquiries" tab lists all customer messages submitted via the website.
*   **Filter:** Use the dropdown to filter by "Unresolved", "Resolved", or "All".
*   **Resolve:** Click the checkbox in the "Status" column to mark an inquiry as resolved (or unresolved).
*   **Delete:** Click the trash icon to delete an inquiry permanently.

## Managing Content (Static)

### Updating Text & Translations
Text content is stored in `data/translations.json` for internationalization.

1.  Open `data/translations.json`.
2.  Find the key corresponding to the text you want to change (e.g., `"hero_title"`).
3.  Update the value for both languages (`en` and `ar`).

## Customization

*   **Currency Rate:** The exchange rate is managed via the **Admin Dashboard** in the "Settings" tab. It is stored in the Supabase `app_settings` table.
