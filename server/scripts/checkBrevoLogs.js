require('dotenv').config();
const brevo = require('@getbrevo/brevo');

async function checkEmailLogs() {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error('❌ BREVO_API_KEY not set');
    process.exit(1);
  }

  try {
    // Initialize Brevo API client for transactional emails
    const apiInstance = new brevo.TransactionalEmailsApi();
    const apiKeyAuth = apiInstance.authentications['apiKey'];
    apiKeyAuth.apiKey = apiKey;

    console.log('✅ Connected to Brevo API\n');
    console.log('📧 Fetching recent email logs...\n');
    console.log('═'.repeat(80));

    // Get email events from the last 7 days
    const opts = {
      limit: 20,
      offset: 0,
      sort: 'desc'
    };

    const result = await apiInstance.getTransacEmailsList(opts);
    const events = result.response?.body?.transactionalEmails || result.body?.transactionalEmails || [];

    if (events.length === 0) {
      console.log('📭 No emails found in recent history');
      console.log('\nThis could mean:');
      console.log('  1. Emails were sent very recently (wait a few minutes)');
      console.log('  2. API key is correct but no emails have been sent yet');
      console.log('  3. Check server logs for sending errors');
      return;
    }

    console.log(`📊 Found ${events.length} recent emails:\n`);

    events.forEach((email, index) => {
      console.log(`\n[${index + 1}] Email ID: ${email.messageId}`);
      console.log(`    To: ${email.email || 'N/A'}`);
      console.log(`    Subject: ${email.subject || 'N/A'}`);
      console.log(`    Date: ${email.date || 'N/A'}`);

      // Status information
      const status = email.event || email.status || 'unknown';
      const statusEmoji = {
        'delivered': '✅',
        'sent': '📤',
        'opened': '👁️',
        'clicked': '🖱️',
        'bounced': '⚠️',
        'hard_bounce': '❌',
        'soft_bounce': '⚠️',
        'blocked': '🚫',
        'spam': '🗑️',
        'invalid': '❌',
        'deferred': '⏳'
      }[status] || '❓';

      console.log(`    Status: ${statusEmoji} ${status.toUpperCase()}`);

      // Additional info if available
      if (email.reason) {
        console.log(`    Reason: ${email.reason}`);
      }
      if (email.tag) {
        console.log(`    Tag: ${email.tag}`);
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n📖 Status meanings:');
    console.log('  ✅ delivered  - Email successfully delivered to inbox');
    console.log('  📤 sent       - Email sent, awaiting delivery confirmation');
    console.log('  ⚠️  bounced    - Email rejected (check email address validity)');
    console.log('  ❌ hard_bounce - Permanent failure (email doesn\'t exist)');
    console.log('  🚫 blocked    - Email blocked by recipient server');
    console.log('  ⏳ deferred   - Temporary delay, will retry');
    console.log('\n💡 Tip: If emails are "sent" but not "delivered", check spam folders!');

  } catch (error) {
    console.error('❌ Error fetching email logs:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.text || error.response.body);
    }
    process.exit(1);
  }
}

checkEmailLogs();
