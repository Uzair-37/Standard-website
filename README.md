# Standard Electronics Website

A professional audio equipment e-commerce website for standardelectronics.in with chatbot integration, AI traffic analytics, and Tally ERP stock synchronization.

## Features

- Responsive e-commerce website for professional audio equipment
- Interactive chatbot for customer support
- AI-powered traffic analytics and optimization
- Real-time stock synchronization with Tally ERP
- Product catalog with search and filtering
- Shopping cart functionality
- Admin dashboard with traffic insights

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)
- Tally ERP software (with XML interface enabled)

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/standardelectronics-website.git
   cd standardelectronics-website
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure Tally integration:
   - Open `backend/tally_integration.js`
   - Update the `tallyConfig` object with your Tally server details

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the website at http://localhost:3000

## Tally ERP Integration

This website integrates with Tally ERP for real-time stock management. The integration works as follows:

1. On server startup, the application syncs inventory data from Tally
2. When products are purchased, stock is automatically updated in Tally
3. Admin can force sync inventory data from Tally using API endpoint

### Tally Configuration

1. Enable Tally XML interface (Tally Gateway)
2. Set the Tally server to allow external connections
3. Configure the company name in the application settings to "StandardElectronics"

## Chatbot Configuration

The chatbot is pre-configured to answer questions about:
- Product information
- Stock availability
- Pricing and shipping details
- General support queries

To customize chatbot responses, modify the `getBotResponse` function in `js/chatbot.js`.

## Development

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Chatbot: Custom JavaScript implementation
- AI Traffic Agent: Real-time analytics and insights
- Tally Integration: XML interface via HTTP requests

## Deployment

For production deployment:

1. Build the project: `npm run build`
2. Set environment variables:
   - PORT: Server port (default: 3000)
   - TALLY_HOST: Tally server address
   - TALLY_PORT: Tally XML port
   - TALLY_COMPANY: Tally company name (StandardElectronics)

3. Start the server: `npm start`
4. Configure your domain standardelectronics.in to point to your server

## License

[MIT License](LICENSE)