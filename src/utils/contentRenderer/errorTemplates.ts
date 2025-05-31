
import { EscapeUtils } from './escapeUtils';

export class ErrorTemplates {
  static createErrorTemplate(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #fef2f2;
      color: #dc2626;
    }
    .error-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h3>⚠️ Template Error</h3>
    <p>${EscapeUtils.escapeHtml(errorMessage)}</p>
  </div>
</body>
</html>`;
  }
}
