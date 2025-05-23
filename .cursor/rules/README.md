# Cursor Rules for Image Generation Gallery

This directory contains comprehensive cursor rules that enforce coding standards, patterns, and best practices for the Image Generation Gallery project.

## Available Rules

### 🏗️ [Project Structure](project-structure.mdc)
**Scope:** All files (`**/*`)
- Overall project organization and architecture
- Directory structure standards
- File naming conventions
- Import organization patterns
- Configuration management
- Documentation standards

### 🐍 [Backend FastAPI](backend-fastapi.mdc)
**Scope:** Backend Python files (`backend/**/*.py`)
- FastAPI development patterns
- Async/await best practices
- Error handling and logging
- Service layer architecture
- Pydantic model patterns
- Database and file storage patterns

### ⚛️ [Frontend React](frontend-react.mdc)
**Scope:** Frontend TypeScript/React files (`frontend/src/**/*.{ts,tsx,js,jsx}`)
- React component patterns
- TypeScript best practices
- State management patterns
- API integration patterns
- Performance optimization
- Accessibility guidelines

### 🧪 [Testing Patterns](testing-patterns.mdc)
**Scope:** Test files (`frontend/src/**/*.test.{ts,tsx}`, `backend/tests/**/*.py`)
- Frontend testing with Vitest and React Testing Library
- Backend testing with Pytest and AsyncIO
- Mocking and fixture patterns
- Coverage requirements
- Test organization

### 🌐 [API Design](api-design.mdc)
**Scope:** API-related files (`backend/app/routes/**/*.py`, `backend/app/schemas/**/*.py`, `frontend/src/api/**/*.ts`)
- RESTful API design principles
- Request/response schema patterns
- Error handling conventions
- Type safety patterns
- API documentation standards

### 🎨 [Styling & Design System](styling-design-system.mdc)
**Scope:** Styling files (`frontend/src/**/*.{css,tsx,ts}`, `frontend/tailwind.config.js`)
- Design system foundation
- Component styling patterns
- Responsive design
- Animation and transitions
- Accessibility considerations

## How These Rules Work

### Automatic Application
- Rules marked with `alwaysApply: true` are automatically enforced
- Cursor will suggest improvements based on these patterns
- Code completion will follow established conventions

### Rule Precedence
- More specific rules (narrower globs) take precedence over general rules
- Rules are applied in order of specificity

### Cross-References
- Rules reference each other using `[filename](mdc:path/to/file)` syntax
- This creates a connected knowledge base for the AI assistant

## Key Principles Enforced

### 🔒 **Type Safety**
- Comprehensive TypeScript usage in frontend
- Pydantic models for all backend data structures
- Proper error handling and validation

### 🧪 **Testing Excellence**
- 100% test coverage requirements
- Comprehensive test patterns for both frontend and backend
- Mock external dependencies appropriately

### 🎯 **Consistency**
- Unified coding standards across the entire project
- Consistent naming conventions and file organization
- Standardized error handling and logging

### 📚 **Documentation**
- Comprehensive docstrings and comments
- Clear API documentation
- Maintainable and readable code

### ♿ **Accessibility**
- WCAG compliance for frontend components
- Semantic HTML usage
- Proper ARIA labels and keyboard navigation

### 🚀 **Performance**
- Optimized React patterns with proper memoization
- Async/await patterns for backend operations
- Efficient database and API patterns

## Usage Tips

### For New Features
1. Check the relevant rule files before starting development
2. Follow the established patterns and conventions
3. Use the provided examples as templates

### For Code Reviews
1. Reference specific rules when providing feedback
2. Ensure new code follows established patterns
3. Update rules if new patterns emerge

### For Maintenance
1. Keep rules up-to-date with project evolution
2. Add new patterns as they are established
3. Remove outdated patterns and examples

## Contributing to Rules

When adding new patterns or updating existing ones:

1. **Follow the established rule format:**
   ```markdown
   ---
   description: Clear description of what the rule enforces
   globs: path/to/files/*.ext
   alwaysApply: boolean
   ---
   ```

2. **Include both DO and DON'T examples**
3. **Reference existing code when possible**
4. **Keep rules DRY by cross-referencing related rules**
5. **Update this README when adding new rules**

## Rule Maintenance

- **Regular Reviews:** Review rules quarterly for relevance
- **Pattern Updates:** Update rules when new patterns emerge
- **Example Refresh:** Keep examples current with actual codebase
- **Cross-Reference Validation:** Ensure all file references are valid

These rules serve as a living documentation system that helps maintain code quality, consistency, and best practices across the entire Image Generation Gallery project. 