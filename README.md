# Advanced Expense Tracker

A modern, feature-rich expense tracking application built with React and Firebase, featuring OCR receipt processing, detailed reporting, and dark mode support.

![Expense Tracker Demo](https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80)

## Features

### Core Functionality
- 📱 Responsive design that works on desktop and mobile
- 🌙 Dark mode support
- 🔒 Secure user authentication
- 📊 Real-time data updates

### Expense Management
- ✏️ Create, edit, and delete expenses
- 🏷️ Categorize expenses
- 📅 Date-based tracking
- 💰 Multiple currency support
- 📝 Add notes and descriptions

### Receipt Processing
- 📸 OCR (Optical Character Recognition) for receipt scanning
- 🤖 Automatic expense category detection
- 📤 Cloud storage for receipts
- 🔄 Automatic data extraction
- ✅ Manual data verification and editing

### Reporting and Analytics
- 📈 Interactive charts and graphs
- 📊 Monthly expense trends
- 🔍 Category-wise breakdown
- 📥 Export reports to PDF/CSV
- 📆 Custom date range filtering

## Technology Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon set
- **React Router** - Client-side routing
- **React Dropzone** - File upload handling
- **Recharts** - Interactive charts
- **React Hot Toast** - Toast notifications

### Backend & Services
- **Firebase**
  - Authentication
  - Firestore database
  - Security rules
- **Cloudinary** - Image storage and management
- **Tesseract.js** - OCR processing

### Development Tools
- **Vite** - Build tool and development server
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **date-fns** - Date manipulation
- **jsPDF** - PDF generation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- A Firebase project
- A Cloudinary account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Firebase and Cloudinary credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

4. Start the development server:
```bash
npm run dev
```

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication with email/password
3. Create a Firestore database
4. Set up Firestore security rules (use the provided `firestore.rules`)
5. Add your Firebase configuration to the environment variables

### Cloudinary Setup

1. Create a Cloudinary account
2. Create an upload preset
3. Add your Cloudinary configuration to the environment variables

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Page components
├── lib/              # Utility functions and configurations
├── assets/           # Static assets
└── types/            # TypeScript type definitions
```

## Key Features Implementation

### Receipt Processing
The application uses Tesseract.js for OCR processing of receipts. The process involves:
1. Image upload to Cloudinary
2. OCR processing with Tesseract.js
3. Data extraction using regex patterns
4. Automatic category detection
5. Manual verification and correction

### Expense Reports
The reporting system provides:
- Monthly trends visualization
- Category-wise expense breakdown
- Exportable reports in PDF and CSV formats
- Interactive charts and graphs

### Security
- Firebase Authentication for user management
- Firestore security rules for data protection
- Secure file upload handling
- Protected API endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev)
- UI components inspired by [Tailwind UI](https://tailwindui.com)
- OCR processing powered by [Tesseract.js](https://tesseract.projectnaptha.com)