import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface KYCDocument {
  id: number;
  user_id: number;
  document_type: 'aadhar' | 'pan' | 'gst' | 'bank_statement' | 'address_proof' | 'business_license';
  document_number?: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified_by?: number;
  verified_at?: Date;
  rejection_reason?: string;
  expiry_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface UploadKYCDocumentRequest {
  document_type: 'aadhar' | 'pan' | 'gst' | 'bank_statement' | 'address_proof' | 'business_license';
  document_number?: string;
  document_url: string;
  expiry_date?: string;
}

interface VerifyKYCDocumentRequest {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}

interface KYCListParams {
  page?: Query<number>;
  limit?: Query<number>;
  user_id?: Query<number>;
  document_type?: Query<string>;
  status?: Query<string>;
}

interface KYCStatus {
  user_id: number;
  overall_status: 'incomplete' | 'pending' | 'verified' | 'rejected';
  required_documents: string[];
  submitted_documents: string[];
  approved_documents: string[];
  rejected_documents: string[];
  completion_percentage: number;
}

// Upload KYC document
export const uploadKYCDocument = api<UploadKYCDocumentRequest, KYCDocument>(
  { auth: true, expose: true, method: "POST", path: "/users/kyc/documents" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.document_type || !req.document_url) {
      throw APIError.badRequest("Document type and document URL are required");
    }

    // Validate document number for specific types
    if (['aadhar', 'pan', 'gst'].includes(req.document_type) && !req.document_number) {
      throw APIError.badRequest(`Document number is required for ${req.document_type}`);
    }

    // Validate document number formats
    if (req.document_number) {
      switch (req.document_type) {
        case 'aadhar':
          if (!/^\d{12}$/.test(req.document_number)) {
            throw APIError.badRequest("Invalid Aadhar number format");
          }
          break;
        case 'pan':
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(req.document_number)) {
            throw APIError.badRequest("Invalid PAN number format");
          }
          break;
        case 'gst':
          if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(req.document_number)) {
            throw APIError.badRequest("Invalid GST number format");
          }
          break;
      }
    }

    try {
      // Check if document type already exists for user
      const existingDoc = await db.queryRow`
        SELECT id, status FROM kyc_documents 
        WHERE user_id = ${auth.userID} AND document_type = ${req.document_type}
        AND status NOT IN ('rejected')
      `;

      if (existingDoc) {
        throw APIError.alreadyExists(`${req.document_type} document already submitted`);
      }

      // Create KYC document
      const kycDocument = await db.queryRow<KYCDocument>`
        INSERT INTO kyc_documents (
          user_id, document_type, document_number, document_url, expiry_date
        ) VALUES (
          ${auth.userID}, ${req.document_type}, ${req.document_number || null}, 
          ${req.document_url}, ${req.expiry_date || null}
        )
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'upload', 'kyc_document', ${kycDocument.id}, ${JSON.stringify(kycDocument)})
      `;

      return kycDocument;

    } catch (error) {
      console.error('KYC document upload error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to upload KYC document");
    }
  }
);

// Get user's KYC documents
export const getUserKYCDocuments = api<{ user_id?: number }, { documents: KYCDocument[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/kyc/documents" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    
    const targetUserId = user_id || parseInt(auth.userID);
    
    // Check permissions
    if (targetUserId !== parseInt(auth.userID) && !auth.permissions.includes('kyc.view')) {
      throw APIError.forbidden("Insufficient permissions to view KYC documents");
    }

    try {
      const documentsQuery = db.query<KYCDocument>`
        SELECT kd.*, 
               v.first_name || ' ' || v.last_name as verified_by_name
        FROM kyc_documents kd
        LEFT JOIN users v ON kd.verified_by = v.id
        WHERE kd.user_id = ${targetUserId}
        ORDER BY kd.created_at DESC
      `;

      const documents: KYCDocument[] = [];
      for await (const doc of documentsQuery) {
        documents.push(doc);
      }

      return { documents };

    } catch (error) {
      console.error('Get KYC documents error:', error);
      throw APIError.internal("Failed to fetch KYC documents");
    }
  }
);

// Get KYC status for user
export const getKYCStatus = api<{ user_id?: number }, KYCStatus>(
  { auth: true, expose: true, method: "GET", path: "/users/kyc/status" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    
    const targetUserId = user_id || parseInt(auth.userID);
    
    // Check permissions
    if (targetUserId !== parseInt(auth.userID) && !auth.permissions.includes('kyc.view')) {
      throw APIError.forbidden("Insufficient permissions to view KYC status");
    }

    try {
      // Get user role to determine required documents
      const user = await db.queryRow`
        SELECT u.id, array_agg(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ${targetUserId}
        GROUP BY u.id
      `;

      if (!user) {
        throw APIError.notFound("User not found");
      }

      // Determine required documents based on user roles
      let requiredDocuments = ['aadhar', 'pan'];
      
      if (user.roles?.includes('vendor')) {
        requiredDocuments.push('gst', 'business_license', 'bank_statement');
      }
      
      if (user.roles?.includes('interior_designer')) {
        requiredDocuments.push('address_proof');
      }

      // Get submitted documents
      const documentsQuery = db.query`
        SELECT document_type, status
        FROM kyc_documents 
        WHERE user_id = ${targetUserId}
        ORDER BY created_at DESC
      `;

      const submittedDocuments: string[] = [];
      const approvedDocuments: string[] = [];
      const rejectedDocuments: string[] = [];

      for await (const doc of documentsQuery) {
        if (!submittedDocuments.includes(doc.document_type)) {
          submittedDocuments.push(doc.document_type);
        }
        
        if (doc.status === 'approved' && !approvedDocuments.includes(doc.document_type)) {
          approvedDocuments.push(doc.document_type);
        }
        
        if (doc.status === 'rejected' && !rejectedDocuments.includes(doc.document_type)) {
          rejectedDocuments.push(doc.document_type);
        }
      }

      // Calculate completion percentage
      const completionPercentage = Math.round((approvedDocuments.length / requiredDocuments.length) * 100);

      // Determine overall status
      let overallStatus: 'incomplete' | 'pending' | 'verified' | 'rejected';
      
      if (approvedDocuments.length === requiredDocuments.length) {
        overallStatus = 'verified';
      } else if (rejectedDocuments.length > 0) {
        overallStatus = 'rejected';
      } else if (submittedDocuments.length > 0) {
        overallStatus = 'pending';
      } else {
        overallStatus = 'incomplete';
      }

      return {
        user_id: targetUserId,
        overall_status: overallStatus,
        required_documents: requiredDocuments,
        submitted_documents: submittedDocuments,
        approved_documents: approvedDocuments,
        rejected_documents: rejectedDocuments,
        completion_percentage: completionPercentage
      };

    } catch (error) {
      console.error('Get KYC status error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to fetch KYC status");
    }
  }
);

// List KYC documents for admin review
export const listKYCDocuments = api<KYCListParams, { documents: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/admin/kyc/documents" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('kyc.manage') && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to view KYC documents");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // User filter
    if (params.user_id) {
      whereClause += ` AND kd.user_id = $${paramIndex}`;
      queryParams.push(params.user_id);
      paramIndex++;
    }

    // Document type filter
    if (params.document_type) {
      whereClause += ` AND kd.document_type = $${paramIndex}`;
      queryParams.push(params.document_type);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND kd.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    try {
      // Get KYC documents
      const documentsQuery = `
        SELECT 
          kd.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          v.first_name || ' ' || v.last_name as verified_by_name
        FROM kyc_documents kd
        JOIN users u ON kd.user_id = u.id
        LEFT JOIN users v ON kd.verified_by = v.id
        ${whereClause}
        ORDER BY kd.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const documentsResult = await db.query(documentsQuery, ...queryParams);
      const documents: any[] = [];
      for await (const doc of documentsResult) {
        documents.push({
          id: doc.id,
          user_id: doc.user_id,
          user_name: doc.user_name,
          user_email: doc.user_email,
          document_type: doc.document_type,
          document_number: doc.document_number,
          document_url: doc.document_url,
          status: doc.status,
          verified_by: doc.verified_by,
          verified_by_name: doc.verified_by_name,
          verified_at: doc.verified_at,
          rejection_reason: doc.rejection_reason,
          expiry_date: doc.expiry_date,
          created_at: doc.created_at,
          updated_at: doc.updated_at
        });
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM kyc_documents kd JOIN users u ON kd.user_id = u.id ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        documents,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List KYC documents error:', error);
      throw APIError.internal("Failed to fetch KYC documents");
    }
  }
);

// Verify KYC document (admin action)
export const verifyKYCDocument = api<{ id: number } & VerifyKYCDocumentRequest, KYCDocument>(
  { auth: true, expose: true, method: "POST", path: "/admin/kyc/documents/:id/verify" },
  async ({ id, status, rejection_reason }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('kyc.manage') && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to verify KYC documents");
    }

    // Validate inputs
    if (!['approved', 'rejected'].includes(status)) {
      throw APIError.badRequest("Status must be 'approved' or 'rejected'");
    }

    if (status === 'rejected' && !rejection_reason) {
      throw APIError.badRequest("Rejection reason is required when rejecting documents");
    }

    try {
      // Get existing document
      const existingDoc = await db.queryRow<KYCDocument>`
        SELECT * FROM kyc_documents WHERE id = ${id}
      `;

      if (!existingDoc) {
        throw APIError.notFound("KYC document not found");
      }

      if (existingDoc.status !== 'pending') {
        throw APIError.badRequest("Only pending documents can be verified");
      }

      // Update document status
      const kycDocument = await db.queryRow<KYCDocument>`
        UPDATE kyc_documents SET
          status = ${status},
          verified_by = ${auth.userID},
          verified_at = NOW(),
          rejection_reason = ${rejection_reason || null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'verify', 'kyc_document', ${id}, ${JSON.stringify(existingDoc)}, ${JSON.stringify(kycDocument)})
      `;

      // TODO: Send notification to user about verification result
      // This would integrate with notification service

      return kycDocument;

    } catch (error) {
      console.error('Verify KYC document error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to verify KYC document");
    }
  }
);

// Get KYC statistics (admin)
export const getKYCStatistics = api<{}, { 
  total_users: number;
  verified_users: number;
  pending_documents: number;
  rejected_documents: number;
  verification_rate: number;
  by_document_type: any[];
}>(
  { auth: true, expose: true, method: "GET", path: "/admin/kyc/statistics" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('kyc.view') && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to view KYC statistics");
    }

    try {
      // Get overall statistics
      const overallStats = await db.queryRow`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN kd.status = 'approved' THEN kd.user_id END) as verified_users,
          COUNT(*) FILTER (WHERE kd.status = 'pending') as pending_documents,
          COUNT(*) FILTER (WHERE kd.status = 'rejected') as rejected_documents
        FROM users u
        LEFT JOIN kyc_documents kd ON u.id = kd.user_id
        WHERE u.is_active = true
      `;

      // Get statistics by document type
      const docTypeQuery = db.query`
        SELECT 
          document_type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected
        FROM kyc_documents
        GROUP BY document_type
        ORDER BY document_type
      `;

      const byDocumentType: any[] = [];
      for await (const row of docTypeQuery) {
        byDocumentType.push({
          document_type: row.document_type,
          total: parseInt(row.total || '0'),
          approved: parseInt(row.approved || '0'),
          pending: parseInt(row.pending || '0'),
          rejected: parseInt(row.rejected || '0')
        });
      }

      const totalUsers = parseInt(overallStats?.total_users || '0');
      const verifiedUsers = parseInt(overallStats?.verified_users || '0');
      const verificationRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

      return {
        total_users: totalUsers,
        verified_users: verifiedUsers,
        pending_documents: parseInt(overallStats?.pending_documents || '0'),
        rejected_documents: parseInt(overallStats?.rejected_documents || '0'),
        verification_rate: verificationRate,
        by_document_type: byDocumentType
      };

    } catch (error) {
      console.error('Get KYC statistics error:', error);
      throw APIError.internal("Failed to fetch KYC statistics");
    }
  }
);

// Bulk verify KYC documents
export const bulkVerifyKYCDocuments = api<{ 
  document_ids: number[];
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}, { success: boolean; processed_count: number }>(
  { auth: true, expose: true, method: "POST", path: "/admin/kyc/documents/bulk-verify" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('kyc.manage') && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to bulk verify KYC documents");
    }

    if (!req.document_ids?.length) {
      throw APIError.badRequest("Document IDs are required");
    }

    if (req.status === 'rejected' && !req.rejection_reason) {
      throw APIError.badRequest("Rejection reason is required when rejecting documents");
    }

    try {
      let processedCount = 0;

      for (const docId of req.document_ids) {
        // Update document status
        const result = await db.queryRow`
          UPDATE kyc_documents SET
            status = ${req.status},
            verified_by = ${auth.userID},
            verified_at = NOW(),
            rejection_reason = ${req.rejection_reason || null},
            updated_at = NOW()
          WHERE id = ${docId} AND status = 'pending'
          RETURNING id
        `;

        if (result) {
          processedCount++;
        }
      }

      // Log bulk activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'bulk_verify', 'kyc_document', 0, ${JSON.stringify({ document_ids: req.document_ids, status: req.status, processed_count: processedCount })})
      `;

      return {
        success: true,
        processed_count: processedCount
      };

    } catch (error) {
      console.error('Bulk verify KYC documents error:', error);
      throw APIError.internal("Failed to bulk verify KYC documents");
    }
  }
);
