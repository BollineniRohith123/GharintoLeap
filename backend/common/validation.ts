import { APIError } from "encore.dev/api";

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

  private static validateInteger(value: any, field: string): ValidationError | null {
    if (!Number.isInteger(Number(value))) {
      return { field, message: `${field} must be an integer` };
    }
    return null;
  }

  private static validateMin(value: number, min: number, field: string): ValidationError | null {
    if (value < min) {
      return { field, message: `${field} must be at least ${min}` };
    }
    return null;
  }

  private static validateMax(value: number, max: number, field: string): ValidationError | null {
    if (value > max) {
      return { field, message: `${field} must be no more than ${max}` };
    }
    return null;
  }

  private static validatePhone(value: string, field: string): ValidationError | null {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(value)) {
      return { field, message: `${field} must be a valid phone number` };
    }
    return null;
  }

  private static validateDate(value: string, field: string): ValidationError | null {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { field, message: `${field} must be a valid date` };
    }
    return null;
  }

  private static validateUrl(value: string, field: string): ValidationError | null {
    try {
      new URL(value);
      return null;
    } catch {
      return { field, message: `${field} must be a valid URL` };
    }
  }

  private static validateIn(value: any, allowedValues: any[], field: string): ValidationError | null {
    if (!allowedValues.includes(value)) {
      return { field, message: `${field} must be one of: ${allowedValues.join(', ')}` };
    }
    return null;
  }

  private static validateAlpha(value: string, field: string): ValidationError | null {
    const alphaRegex = /^[a-zA-Z\s]+$/;
    if (!alphaRegex.test(value)) {
      return { field, message: `${field} must contain only letters and spaces` };
    }
    return null;
  }

  private static validateAlphanumeric(value: string, field: string): ValidationError | null {
    const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
    if (!alphanumericRegex.test(value)) {
      return { field, message: `${field} must contain only letters, numbers, and spaces` };
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
          } else if (typeof value === 'number') {
            error = this.validateMax(value, max, rule.field);
          }
        } else if (ruleString === 'numeric') {
          if (value) error = this.validateNumeric(value, rule.field);
        } else if (ruleString === 'integer') {
          if (value) error = this.validateInteger(value, rule.field);
        } else if (ruleString === 'phone') {
          if (value) error = this.validatePhone(value, rule.field);
        } else if (ruleString === 'date') {
          if (value) error = this.validateDate(value, rule.field);
        } else if (ruleString === 'url') {
          if (value) error = this.validateUrl(value, rule.field);
        } else if (ruleString.startsWith('in:')) {
          const allowedValues = ruleString.split(':')[1].split(',');
          if (value) error = this.validateIn(value, allowedValues, rule.field);
        } else if (ruleString === 'alpha') {
          if (value) error = this.validateAlpha(value, rule.field);
        } else if (ruleString === 'alphanumeric') {
          if (value) error = this.validateAlphanumeric(value, rule.field);
        }

        if (error) {
          if (rule.message) {
            error.message = rule.message;
          }
          errors.push(error);
          break; // Stop validating this field on first error
        }
      }
    }

    return errors;
  }

  static validateAndThrow(data: Record<string, any>, rules: ValidationRule[]): void {
    const errors = this.validate(data, rules);
    if (errors.length > 0) {
      throw APIError.invalidArgument(`Validation failed: ${errors.map(e => e.message).join(', ')}`, errors);
    }
  }
}

// Common validation rule sets
export const UserValidationRules = {
  create: [
    { field: 'email', rules: ['required', 'email', 'max:255'] },
    { field: 'first_name', rules: ['required', 'alpha', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['required', 'alpha', 'min:2', 'max:100'] },
    { field: 'password', rules: ['required', 'min:8', 'max:100'] },
    { field: 'phone', rules: ['phone', 'max:20'] },
    { field: 'city', rules: ['alpha', 'max:100'] },
    { field: 'state', rules: ['alpha', 'max:100'] },
    { field: 'country', rules: ['alpha', 'max:100'] }
  ],
  update: [
    { field: 'email', rules: ['email', 'max:255'] },
    { field: 'first_name', rules: ['alpha', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['alpha', 'min:2', 'max:100'] },
    { field: 'phone', rules: ['phone', 'max:20'] },
    { field: 'city', rules: ['alpha', 'max:100'] },
    { field: 'state', rules: ['alpha', 'max:100'] },
    { field: 'country', rules: ['alpha', 'max:100'] }
  ]
};

export const LeadValidationRules = {
  create: [
    { field: 'source', rules: ['required', 'in:website,referral,social,advertisement,walk-in'] },
    { field: 'first_name', rules: ['required', 'alpha', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['required', 'alpha', 'min:2', 'max:100'] },
    { field: 'email', rules: ['required', 'email', 'max:255'] },
    { field: 'phone', rules: ['required', 'phone', 'max:20'] },
    { field: 'city', rules: ['required', 'alpha', 'max:100'] },
    { field: 'budget_min', rules: ['numeric', 'min:0'] },
    { field: 'budget_max', rules: ['numeric', 'min:0'] },
    { field: 'project_type', rules: ['in:residential,commercial,retail,hospitality'] },
    { field: 'property_type', rules: ['in:apartment,villa,office,shop,restaurant,hotel'] },
    { field: 'timeline', rules: ['in:immediate,1-3months,3-6months,6-12months,flexible'] },
    { field: 'description', rules: ['max:1000'] }
  ],
  update: [
    { field: 'source', rules: ['in:website,referral,social,advertisement,walk-in'] },
    { field: 'first_name', rules: ['alpha', 'min:2', 'max:100'] },
    { field: 'last_name', rules: ['alpha', 'min:2', 'max:100'] },
    { field: 'email', rules: ['email', 'max:255'] },
    { field: 'phone', rules: ['phone', 'max:20'] },
    { field: 'city', rules: ['alpha', 'max:100'] },
    { field: 'budget_min', rules: ['numeric', 'min:0'] },
    { field: 'budget_max', rules: ['numeric', 'min:0'] },
    { field: 'project_type', rules: ['in:residential,commercial,retail,hospitality'] },
    { field: 'property_type', rules: ['in:apartment,villa,office,shop,restaurant,hotel'] },
    { field: 'timeline', rules: ['in:immediate,1-3months,3-6months,6-12months,flexible'] },
    { field: 'description', rules: ['max:1000'] },
    { field: 'status', rules: ['in:new,contacted,qualified,proposal,negotiation,won,lost'] },
    { field: 'score', rules: ['integer', 'min:0', 'max:100'] }
  ]
};

export const ProjectValidationRules = {
  create: [
    { field: 'title', rules: ['required', 'min:5', 'max:200'] },
    { field: 'description', rules: ['max:2000'] },
    { field: 'client_id', rules: ['required', 'integer', 'min:1'] },
    { field: 'budget', rules: ['required', 'numeric', 'min:1000'] },
    { field: 'estimated_cost', rules: ['numeric', 'min:0'] },
    { field: 'start_date', rules: ['date'] },
    { field: 'end_date', rules: ['date'] },
    { field: 'estimated_end_date', rules: ['date'] },
    { field: 'city', rules: ['alpha', 'max:100'] },
    { field: 'area_sqft', rules: ['integer', 'min:1'] },
    { field: 'property_type', rules: ['in:apartment,villa,office,shop,restaurant,hotel'] },
    { field: 'priority', rules: ['in:low,medium,high,urgent'] }
  ],
  update: [
    { field: 'title', rules: ['min:5', 'max:200'] },
    { field: 'description', rules: ['max:2000'] },
    { field: 'budget', rules: ['numeric', 'min:1000'] },
    { field: 'estimated_cost', rules: ['numeric', 'min:0'] },
    { field: 'actual_cost', rules: ['numeric', 'min:0'] },
    { field: 'start_date', rules: ['date'] },
    { field: 'end_date', rules: ['date'] },
    { field: 'estimated_end_date', rules: ['date'] },
    { field: 'city', rules: ['alpha', 'max:100'] },
    { field: 'area_sqft', rules: ['integer', 'min:1'] },
    { field: 'property_type', rules: ['in:apartment,villa,office,shop,restaurant,hotel'] },
    { field: 'status', rules: ['in:planning,design,approval,execution,testing,completed,cancelled'] },
    { field: 'priority', rules: ['in:low,medium,high,urgent'] },
    { field: 'progress_percentage', rules: ['integer', 'min:0', 'max:100'] }
  ]
};

export const MaterialValidationRules = {
  create: [
    { field: 'name', rules: ['required', 'min:3', 'max:200'] },
    { field: 'category', rules: ['required', 'max:100'] },
    { field: 'subcategory', rules: ['max:100'] },
    { field: 'brand', rules: ['max:100'] },
    { field: 'model', rules: ['max:100'] },
    { field: 'description', rules: ['max:2000'] },
    { field: 'unit', rules: ['required', 'max:20'] },
    { field: 'price', rules: ['required', 'numeric', 'min:0'] },
    { field: 'discounted_price', rules: ['numeric', 'min:0'] },
    { field: 'stock_quantity', rules: ['integer', 'min:0'] },
    { field: 'min_order_quantity', rules: ['integer', 'min:1'] },
    { field: 'lead_time_days', rules: ['integer', 'min:0'] }
  ]
};