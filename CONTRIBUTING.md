# CONTRIBUTING.md
# Contributing to Living Data Service

Thank you for considering contributing to Living Data Service! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs
- Use the bug report template
- Include steps to reproduce
- Specify your environment (OS, Node version, PDF viewer)
- Add relevant logs or error messages

### Suggesting Features  
- Use the feature request template
- Explain the problem you're trying to solve
- Describe your proposed solution
- Consider backwards compatibility

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/living-data-service.git
cd living-data-service

# Install dependencies
npm install

# Set up development environment
npm run setup

# Start development server
npm run dev

# Run tests
npm test
```

## 📋 Code Standards

- **ESLint**: We use ESLint for code style
- **Prettier**: Code formatting is handled by Prettier
- **Tests**: All new features should include tests
- **Documentation**: Update README and docs for new features

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(api): add document deletion endpoint`
- `fix(pdf): resolve JavaScript injection issue`
- `docs(readme): update installation instructions`

## 🔧 Project Structure

```
living-data-service/
├── src/
│   ├── server.js          # Main application file
│   ├── LivingDataService.jsx  # React frontend component
│   └── main.jsx           # Frontend entry point
├── package.json           # Dependencies and scripts  
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Container definition
├── data/                  # Database and persistent storage
├── uploads/               # Temporary upload storage
├── living-pdfs/          # Generated document storage
├── public/               # Built frontend files
└── .github/              # GitHub templates and workflows
```

## 🧪 Testing

We use Jest for testing. Please ensure all tests pass before submitting:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('POST /api/create-living-pdf', () => {
  test('should create living PDF successfully', async () => {
    const response = await request(app)
      .post('/api/create-living-pdf')
      .attach('pdf', 'tests/fixtures/sample.pdf')
      .field('documentName', 'Test Document');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Release Process

1. All changes go through Pull Requests
2. Maintainers review and approve changes  
3. Changes are merged to `main` branch
4. GitHub Actions runs CI/CD pipeline
5. Successful builds are deployed automatically

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Getting Help

- **Documentation**: Check the [docs/](docs/) folder
- **Discussions**: Use [GitHub Discussions](https://github.com/yourusername/living-data-service/discussions)
- **Professional Support**: Contact [@bematic](https://twitter.com/bematic) for enterprise integrations
- **Issues**: Search existing issues before creating new ones
- **Email**: For sensitive issues, contact maintainers directly

## 🏆 Contributors

Thank you to all our contributors! Your contributions make this project better.

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- This will be automatically updated -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

**Happy Contributing! 🎉**
