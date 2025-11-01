import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditEventType, AuditSeverity } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     request.ip ||
                     'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!body.user_email || !body.action || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, action, description' },
        { status: 400 }
      );
    }

    // Enhance the event with server-side data
    const auditEvent = {
      event_type: body.event_type || AuditEventType.SYSTEM_ACCESS,
      severity: body.severity || AuditSeverity.LOW,
      user_email: body.user_email,
      user_role: body.user_role,
      user_team: body.user_team,
      resource_type: body.resource_type,
      resource_name: body.resource_name,
      resource_id: body.resource_id,
      action: body.action,
      action_result: body.action_result || 'SUCCESS',
      description: body.description,
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: body.session_id,
      request_id: body.request_id,
      approver_email: body.approver_email,
      approval_status: body.approval_status,
      metadata: {
        ...body.metadata,
        client_side: true,
        server_processed: true,
        received_at: new Date().toISOString()
      },
      before_state: body.before_state,
      after_state: body.after_state,
      risk_score: body.risk_score,
      compliance_tags: body.compliance_tags
    };

    // Log the event using the server-side audit logger
    await auditLogger.logEvent(auditEvent);

    // Return success response
    return NextResponse.json({
      success: true,
      event_id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      message: 'Audit event logged successfully'
    });

  } catch (error) {
    console.error('Error processing audit event:', error);

    // Log the error as a security event
    try {
      await auditLogger.logEvent({
        event_type: AuditEventType.SECURITY_VIOLATION,
        severity: AuditSeverity.HIGH,
        user_email: 'system',
        action: 'audit_api_error',
        action_result: 'FAILURE',
        description: `Audit API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error_type: error instanceof Error ? error.name : 'UnknownError',
          error_message: error instanceof Error ? error.message : String(error),
          endpoint: '/api/audit'
        },
        compliance_tags: ['system_error', 'audit_failure']
      });
    } catch (logError) {
      console.error('Failed to log audit API error:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to process audit event' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
