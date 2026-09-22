import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Top running header (page 2 only)
        if self._pageNumber > 1:
            self.drawString(40, 755, "KLYPERIX OUTREACH & GROWTH ENGINE — CLIENT HANDOVER REPORT")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 748, 572, 748)

        # Bottom footer on all pages
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 36, 572, 36)
        
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 24, page_text)
        self.drawString(40, 24, "Confidential — Klyperix Production Handover Documentation")
        self.restoreState()

def build_pdf(filename="KLYPERIX_OUTREACH_CLIENT_HANDOVER_REPORT.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=36,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Palette
    c_primary = colors.HexColor("#251142")
    c_secondary = colors.HexColor("#5c2f8f")
    c_accent = colors.HexColor("#8400ff")
    c_dark = colors.HexColor("#1e293b")
    c_light_bg = colors.HexColor("#faf5ff")
    c_border = colors.HexColor("#e2e8f0")

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=c_primary,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_dark,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=c_dark,
        leftIndent=10,
        firstLineIndent=-7,
        spaceAfter=2.5
    )

    cell_style = ParagraphStyle(
        'Cell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=c_primary
    )

    cell_code = ParagraphStyle(
        'CellCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=7,
        leading=9,
        textColor=c_accent
    )

    story = []

    # ================= PAGE 1 =================
    # Top Banner Table
    banner_data = [
        [
            Paragraph("<b>KLYPERIX OUTREACH & CONTENT ENGINE</b>", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=14, textColor=colors.white, leading=17)),
            Paragraph("v2.0 Production Handover", ParagraphStyle('B2', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#e9d5ff'), alignment=2, leading=17))
        ],
        [
            Paragraph("Comprehensive Summary: What was Changed, Added, Removed & Full API / Credential Guide", ParagraphStyle('B3', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#d8b4fe'), leading=10)),
            ""
        ]
    ]
    banner_table = Table(banner_data, colWidths=[382, 150])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_primary),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('SPAN', (0, 1), (1, 1)),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 1),
        ('TOPPADDING', (0, 1), (-1, 1), 1),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 6))

    # Executive Overview
    exec_text = (
        "<b>Executive Summary:</b> Full-stack client acquisition and social publishing platform for Klyperix. "
        "Integrates real-time lead generation (Google Maps, YouTube Creators, Reddit Hiring Posts, Live Web Scraper), "
        "AI outreach writing (Groq Llama 3.3 70B), multi-channel outreach (WhatsApp with 40-msg/day anti-ban & Gmail OAuth 2.0), "
        "and a 1-Click Multi-Platform Social Media Publishing Studio."
    )
    exec_table = Table([[Paragraph(exec_text, body_style)]], colWidths=[532])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#d8b4fe')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 4))

    # Section 1: What was Changed
    story.append(Paragraph("1. WHAT WE CHANGED (Major Modifications)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_secondary, spaceAfter=4, spaceBefore=1))

    changes = [
        ("AI Social Output Normalization", "Standardized keys between backend AI (Groq Llama 3.3) and frontend so all 5 platforms (Instagram, LinkedIn, YouTube Shorts, X, Facebook) reliably display native headlines, captions, takeaways, and hashtags."),
        ("1-Click Social Publishing Flow", "Replaced static status badges with an active Multi-Platform Launchpad modal. Clicking '1-Click Publish' saves the post, generates verified web intents, and opens 1-click dispatch controls with auto-clipboard integration."),
        ("Modernized Web Intent Endpoints", "Upgraded sharing endpoints to modern standards (x.com/intent/post, pre-filled LinkedIn feed composer, Facebook sharer, YouTube Studio upload, Instagram Creator Studio)."),
        ("Real Data Pipelines replacing Mock Stubs", "Refactored search pipelines to use real production services (OpenStreetMap / Google Places API, YouTube Data API v3, Reddit Script API, native Web Contact Crawler) instead of simulated demo leads."),
        ("TypeScript Strict Compilation", "Resolved all typing errors across server and client codebase. Both 'npm run build:server' and 'npm run build:client' compile cleanly with zero errors (Exit Code 0).")
    ]
    for title, desc in changes:
        story.append(Paragraph(f"<b>• {title}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 4))

    # Section 2: What was Added
    story.append(Paragraph("2. WHAT WE ADDED (New Features & Capabilities)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_secondary, spaceAfter=4, spaceBefore=1))

    additions = [
        ("Social Media Client Credentials UI (Settings Tab)", "Added dedicated fields in Settings for LinkedIn Client ID & Secret, X (Twitter) API Key & Secret, and Meta (Instagram & Facebook) App ID & Token."),
        ("AI Content Studio & 1-Click Multi-Publish (Tab #6)", "Dedicated studio for Reels, Videos, Images, Carousels, and Posts. Supports dual brand modes ('Klyperix Production' & 'Klyperix Gems & Jewels') with single-click AI generation across 5 platforms."),
        ("Interactive Multi-Platform Launchpad Modal", "Dedicated dispatch modal for Instagram, LinkedIn, YouTube, X, and Facebook with live text preview, one-click copy buttons, and direct 'Open & Post' buttons."),
        ("In-Tab Direct Action Launcher", "Within each preview tab under '2. AI Native Formats', added a direct 'Post on [Platform] Now' button that copies formatted content and opens the official composer."),
        ("Content Pipeline Management (Launch & Delete)", "Added 'Launch / Re-post' button to relaunch any past post, and 'Delete' button to permanently purge unwanted pipeline records."),
        ("WhatsApp Native Web Engine with Anti-Ban Guard", "Direct Baileys QR web socket pairing with a mandatory 40-message daily rate limit, automated pacing delays (12-25s), and auto-pause protection."),
        ("Official Gmail Sign-In via Google OAuth 2.0", "One-click OAuth 2.0 login under client's personal/workspace Google account, storing offline refresh tokens to send verified emails directly.")
    ]
    for title, desc in additions:
        story.append(Paragraph(f"<b>• {title}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 4))

    # Section 3: What was Removed
    story.append(Paragraph("3. WHAT WE REMOVED (And Why)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_secondary, spaceAfter=4, spaceBefore=1))

    removals = [
        ("Gmail App Password (SMTP) & Unneeded Signature Cards", "Removed: Confusing manual SMTP passwords and extra signature cards removed to keep Settings clean, in favor of 1-click Google Sign-In and Social Credentials."),
        ("Fabricated Freelance Platforms (Upwork, Freelancer, Fiverr)", "Removed: Scraping freelance sites without enterprise API access violates their Terms of Service and guarantees IP/account termination. Replaced with 100% legal Google Maps and Reddit hiring posts."),
        ("Unauthorized Private DM Bots (Instagram / X / LinkedIn)", "Removed: Private DM automation bots risk permanent ban of client social handles. Replaced with 100% TOS-compliant Web Intent Launchers and verified contact scrapers."),
        ("Static Mock Indicators & Hardcoded Statuses", "Removed: Replaced all fake 'connected' indicators with live token/API health verification.")
    ]
    for title, desc in removals:
        story.append(Paragraph(f"<b>• {title}:</b> {desc}", bullet_style))

    # ================= PAGE 2 =================
    story.append(PageBreak())

    story.append(Paragraph("4. APIS & CLIENT CREDENTIALS SPECIFICATION", h1_style))
    story.append(Paragraph(
        "The platform is built with a <b>Zero-Cost Baseline</b>: WhatsApp outreach, OpenStreetMap lead search, and 1-Click Social Posting work out-of-the-box with zero API keys. Below is the complete credential reference for optional upgrades and AI engines.",
        body_style
    ))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_secondary, spaceAfter=6, spaceBefore=1))

    headers = [
        Paragraph("<b>Service</b>", cell_bold),
        Paragraph("<b>Credential / Env Key</b>", cell_bold),
        Paragraph("<b>Where to Obtain</b>", cell_bold),
        Paragraph("<b>Status / Necessity</b>", cell_bold),
        Paragraph("<b>Purpose & Function</b>", cell_bold),
    ]

    rows = [
        headers,
        [
            Paragraph("<b>Groq AI</b><br/>(Llama 3.3 70B)", cell_style),
            Paragraph("<code>GROQ_API_KEY</code>", cell_code),
            Paragraph("console.groq.com/keys", cell_style),
            Paragraph("<font color='#059669'><b>Pre-Configured</b></font>", cell_style),
            Paragraph("Writes AI outreach pitches, website audits, and 5 native social copies.", cell_style),
        ],
        [
            Paragraph("<b>Google Sign-In</b><br/>(Gmail OAuth 2.0)", cell_style),
            Paragraph("<code>GOOGLE_CLIENT_ID</code><br/><code>GOOGLE_CLIENT_SECRET</code>", cell_code),
            Paragraph("console.cloud.google.com<br/>(Enable Gmail API)", cell_style),
            Paragraph("<font color='#d97706'><b>Recommended</b></font><br/>(One-time setup)", cell_style),
            Paragraph("Enables 1-click 'Sign in with Google' to send real emails from client's Gmail address.", cell_style),
        ],
        [
            Paragraph("<b>Google Maps</b><br/>(Places API)", cell_style),
            Paragraph("<code>GOOGLE_PLACES_API_KEY</code>", cell_code),
            Paragraph("console.cloud.google.com<br/>(Enable Places API)", cell_style),
            Paragraph("<font color='#64748b'><b>Optional Upgrade</b></font><br/>(Free OSM Active)", cell_style),
            Paragraph("Upgrades local business search with verified Google ratings, reviews, and places data.", cell_style),
        ],
        [
            Paragraph("<b>YouTube Search</b><br/>(Data API v3)", cell_style),
            Paragraph("<code>YOUTUBE_API_KEY</code>", cell_code),
            Paragraph("console.cloud.google.com<br/>(Enable YouTube v3)", cell_style),
            Paragraph("<font color='#64748b'><b>Optional</b></font><br/>(For Creator Niche)", cell_style),
            Paragraph("Discovers YouTube channels, creator subscriber counts, video volume, and topics.", cell_style),
        ],
        [
            Paragraph("<b>Reddit Hiring</b><br/>(Script App)", cell_style),
            Paragraph("<code>REDDIT_API_KEY</code><br/><code>(id:secret)</code>", cell_code),
            Paragraph("reddit.com/prefs/apps<br/>(Create 'script' app)", cell_style),
            Paragraph("<font color='#64748b'><b>Optional</b></font><br/>(For Job Posts)", cell_style),
            Paragraph("Searches active hiring subreddits (r/forhire, r/freelance_forhire) for paid gigs.", cell_style),
        ],
        [
            Paragraph("<b>WhatsApp Web</b><br/>(Baileys Engine)", cell_style),
            Paragraph("<b>None Required</b><br/>(Native QR Link)", cell_code),
            Paragraph("Connections Hub -> Click 'Pair WhatsApp' & scan", cell_style),
            Paragraph("<font color='#059669'><b>Zero Keys</b></font>", cell_style),
            Paragraph("Direct phone link like WhatsApp Web. Includes 40-msg/day anti-ban rate limiting.", cell_style),
        ],
        [
            Paragraph("<b>Social Publishing</b><br/>(Current Mode)", cell_style),
            Paragraph("<b>None Required</b><br/>(Web Intent Mode)", cell_code),
            Paragraph("1-Click Launchpad directly launches official web composers", cell_style),
            Paragraph("<font color='#059669'><b>Zero Keys</b></font>", cell_style),
            Paragraph("100% compliant, zero ban risk. Auto-copies captions & hashtags to clipboard.", cell_style),
        ],
        [
            Paragraph("<b>Social Auto-Post</b><br/>(Optional Future API)", cell_style),
            Paragraph("LinkedIn: Client ID/Secret<br/>X: API Key + Secret<br/>Meta: App ID + Token", cell_code),
            Paragraph("LinkedIn Devs / X Dev Portal / Meta Developers", cell_style),
            Paragraph("<font color='#64748b'><b>Optional</b></font><br/>(Needs App Review)", cell_style),
            Paragraph("Required ONLY if client wants background automated posting without browser tabs.", cell_style),
        ],
    ]

    api_table = Table(rows, colWidths=[85, 110, 115, 87, 135])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(api_table)
    story.append(Spacer(1, 10))

    # Section 5: Delivery Checklist
    story.append(Paragraph("5. CLIENT DELIVERY CHECKLIST & INSTRUCTIONS", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_secondary, spaceAfter=6, spaceBefore=1))

    checklist_items = [
        "<b>1. Running the Platform:</b> Run <code>npm run dev</code> from project root. Access frontend on <code>http://localhost:5173</code> and backend on <code>http://localhost:3001</code>.",
        "<b>2. Connecting WhatsApp:</b> Go to <b>Connections</b> tab -> WhatsApp card -> Click <b>Pair WhatsApp</b> -> Scan QR code with phone camera / WhatsApp Linked Devices (capped at 40 msgs/day for safety).",
        "<b>3. Connecting Gmail:</b> Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>server/.env</code> -> Click <b>Sign in with Google</b> -> Grant Gmail permissions.",
        "<b>4. Launching Social Posts:</b> Go to <b>Content Studio</b> (Tab #6) -> Select Content Type -> Enter core idea -> Click <b>Generate Multi-Platform AI Copy</b> -> Click <b>1-Click Publish to All</b> to launch across Instagram, LinkedIn, YouTube, X, and Facebook!"
    ]

    for item in checklist_items:
        story.append(Paragraph(f"• {item}", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated clean 2-page {filename}")

if __name__ == "__main__":
    build_pdf()
