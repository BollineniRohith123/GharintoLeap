import { Service } from "encore.dev/service";

export default new Service("finance");

// Import all finance-related APIs
import "./quotation_service";
import "./invoice_service";
import "./purchase_order_service";
import "./tax_service";
import "./financial_reports";
