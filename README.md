# Notification Microservice

A high-performance, resilient notification microservice built with Node.js and TypeScript. Supporting multiple channels including Email (Resend), Push (Firebase), and SMS (Twilio), with built-in queuing and intelligent retry logic.

## 🚀 Key Features

- **Multi-channel Support**: 
  - **Email**: Powered by [Resend](https://resend.com) with [react-email](https://react.email) templates.
  - **Push**: Managed via [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging).
  - **SMS**: Delivered through [Twilio](https://www.twilio.com).
- **Lightweight Persistence**: Uses **SQLite** via `better-sqlite3` for fast, intentional, and zero-configuration storage.
- **Resilient Delivery**: 
  - **Custom Queue System**: Separate priority and normal queues for different channels.
  - **Exponential Backoff**: Automatic retries (default 3x) with increasing delays.
  - **Rate Limiting**: Built-in protection to stay within provider quotas.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Database**: SQLite (`better-sqlite3`)
- **Email**: Resend, React-email
- **SMS**: Twilio
- **Push**: Firebase Admin SDK
- **Web Framework**: Express

---

## 📧 Email System

This service supports two ways of sending emails:

### 1. Normal Email (Direct)
Send standard HTML or plain text emails directly by providing the content in the payload.

### 2. Templated Email (Beautiful)
Leverage `react-email` to send professionally designed, responsive emails.

#### **How to Add a New Email Template:**

1.  **Create the Template**: 
    Create a new `.tsx` file in `src/templates/email/` (e.g., `MyNewTemplate.tsx`). Use standard `react-email` components.
    ```tsx
    // src/templates/email/MyNewTemplate.tsx
    export const MyNewTemplate = ({ name }: { name: string }) => (
      <Html>
        <Text>Hello {name}, this is a templated email!</Text>
      </Html>
    );
    ```

2.  **Register the Template**:
    Open `src/services/emailTemplate.service.ts` and add your template metadata to the `registerTemplates` method.
    ```typescript
    this.templates.set('my-template-id', {
      id: 'my-template-id',
      name: 'My New Template',
      description: 'A description of what this email does',
      defaultSubject: 'Welcome to our platform!',
      requiredVariables: ['name'],
    });
    ```

3.  **Implement the Renderer**:
    In the same file (`src/services/emailTemplate.service.ts`), update the `renderTemplate` method's `switch` statement handles your template.
    ```typescript
    switch (templateId) {
      case 'my-template-id':
        component = React.createElement(MyNewTemplate, variables as any);
        break;
      // ... other cases
    }
    ```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- Local SQLite installation (not strictly required as `better-sqlite3` handles it)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd notification-ms
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in your credentials.
    ```bash
    cp .env.example .env
    ```

### Running the App

```bash
# Development mode with hot-reloading
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 📂 Project Structure

- `src/api`: Route and Controller definitions.
- `src/config`: Environment and service configurations.
- `src/controllers`: Request handlers.
- `src/lib`: Core logic including `queueManager` and `rateLimiter`.
- `src/providers`: External service integrations (Email, SMS, Push).
- `src/services`: Business logic (Notification, Email Templates, Scheduler).
- `src/stores`: Data access layer (SQLite).
- `src/templates`: React-email templates.

## 🔄 Notification Workflow

1.  **Creation**: A notification request is received and stored in SQLite with a `pending` status.
2.  **Queuing**: The notification is added to the appropriate channel queue (Email/SMS/Push) based on priority.
3.  **Processing**: The `queueManager` picks up the job and calls the respective `provider`.
4.  **Failure & Retry**: If a provider fails, the service calculates an exponential backoff delay and re-queues the notification (up to 3 times).
5.  **Completion**: Upon success or final failure, the status is updated in the database for tracking.

---

## 🛡 License

ISC License.
