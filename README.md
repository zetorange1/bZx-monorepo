# b0x_portal

Frontend portal for b0x

## Development Setup

Run `npm install` at the project root.

Run `npm run dev` to start up the development server.

### Visual Studio Code

If you are using VSCode as your editor, make sure to install the following packages:

* ESLint

Your settings for optimal developer experience (DX) should include:

```json
{
  "eslint.autoFixOnSave": true
}
```

## Building for Production

1. Ensure dependencies are installed: `npm install`.
2. Ensure that pages to be exported are specified in `next.config.js`.
2. Type `npm run build` and your static output will be located in the `/portal` directory.