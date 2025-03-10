# Credit Card Validator

A robust credit card validation tool that provides comprehensive card checking capabilities with a sleek, user-friendly interface.

## Features

- Single card validation with detailed information
- Multiple/Bulk card validation support
- BIN/IIN lookup with bank and country details
- Live, Dead, and Unknown card status classification
- Beautiful user interface with dark mode support

## Tech Stack

- React.js frontend
- TypeScript for type safety
- Express.js backend
- Tailwind CSS for styling
- Shadcn UI components
- Stripe API integration for card validation

## How It Works

The application uses Stripe's payment processing API to check card details and classify them as:

- **LIVE**: Cards that pass basic validation and could potentially be charged
- **DEAD**: Cards that are declined due to issues like expiration, insufficient funds, etc.
- **UNKNOWN**: Cards with unclear status

## Usage

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Visit `http://localhost:5000` in your browser.

## Card Validation

The system checks cards through direct API calls to Stripe using a public key, classifying cards based on specific response patterns.

## Disclaimer

This tool is for educational purposes only. Always ensure compliance with appropriate laws and regulations when handling payment information.

## License

MIT