export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ValidationService {
  private static validateRequired(value: any, field: string): ValidationError | null {
    if (value === undefined || value === null || value === '') {
      return { field, message: `${field} is required` };
    }
    return null;
  }

  private static validateEmail(value: string, field: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { field, message: `${field} must be a valid email address` };
    }
    return null;
  }

  private static validateMinLength(value: string, minLength: number, field: string): ValidationError | null {
    if (value.length < minLength) {
      return { field, message: `${field} must be at least ${minLength} characters long` };
    }
    return null;
  }

  private static validateMaxLength(value: string, maxLength: number, field: string): ValidationError | null {
    if (value.length > maxLength) {
      return { field, message: `${field} must be no more than ${maxLength} characters long` };
    }
    return null;
  }

  private static validateNumeric(value: any, field: string): ValidationError | null {
    if (isNaN(Number(value))) {
      return { field, message: `${field} must be a number` };
    }
    return null;
  }

  private static validateMin(value: number, min: number, field: string): ValidationError | null {
    if (value < min) {
      return { field, message: `${field} must be at least ${min}` };
    }
    return null;
  }

  static validate(data: Record<string, any>, rules: ValidationRule[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      for (const ruleString of rule.rules) {
        let error: ValidationError | null = null;

        if (ruleString === 'required') {
          error = this.validateRequired(value, rule.field);
        } else if (ruleString === 'email') {
          if (value) error = this.validateEmail(value, rule.field);
        } else if (ruleString.startsWith('min:')) {
          const min = parseInt(ruleString.split(':')[1]);
          if (typeof value === 'string') {
            error = this.validateMinLength(value, min, rule.field);
          } else if (typeof value === 'number') {
            error = this.validateMin(value, min, rule.field);
          }
        } else if (ruleString.startsWith('max:')) {
          const max = parseInt(ruleString.split(':')[1]);
          if (typeof value === 'string') {
            error = this.validateMaxLength(value, max, rule.field);
          }
        } else if (ruleString === 'numeric') {
          if (value) error = this.validateNumeric(value, rule.field);
        }

        if (error) {
          if (rule.message) {
            error.message = rule.message;
          }
          errors.push(error);
          break;
        }
      }
    }

    return errors;
  }

  static validateAndThrow(data: Record<string, any>, rules: ValidationRule[]): void {
    const errors = this.validate(data, rules);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }
  }
}

// Common validation rule sets
export const MaterialValidationRules = {
  create: [
    { field: 'name', rules: ['required', 'min:3', 'max:200'] },
    { field: 'category', rules: ['required', 'max:100'] },
    { field: 'unit', rules: ['required', 'max:20'] },
    { field: 'price', rules: ['required', 'numeric', 'min:0'] }
  ]
};

export const UserValidationRules = {
  create: [
    { field: 'email', rules: ['required', 'email', 'max:255'] },
    { field: 'first_name', rules: ['required', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['required', 'min:2', 'max:100'] },
    { field: 'password', rules: ['required', 'min:8', 'max:100'] }
  ]
};

export const LeadValidationRules = {
  create: [
    { field: 'first_name', rules: ['required', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['required', 'min:2', 'max:100'] },
    { field: 'email', rules: ['required', 'email', 'max:255'] },
    { field: 'phone', rules: ['required', 'min:10', 'max:20'] },
    { field: 'city', rules: ['required', 'max:100'] }
  ]
};