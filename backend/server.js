// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Default logo path
const DEFAULT_LOGO_PATH = path.join(__dirname, process.env.LOGO_PATH || 'public/assets/default/getawayvibelogo.png');

// Helper function to check if default logo exists
const getDefaultLogoPath = () => {
  if (fs.existsSync(DEFAULT_LOGO_PATH)) {
    // Return HTTP URL using environment variable
    return process.env.LOGO_URL || `${SERVER_URL}/public/assets/default/getawayvibelogo.png`;
  }
  return null;
};

// Helper function to merge PDFs with enhanced error handling
const mergePDFs = async (itineraryPdfBuffer) => {
  try {
    console.log('Starting PDF merge process...');
    
    // Create main PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Add the generated itinerary
    console.log('Loading main itinerary PDF...');
    const itineraryPdf = await PDFDocument.load(itineraryPdfBuffer);
    const itineraryPages = await mergedPdf.copyPages(itineraryPdf, itineraryPdf.getPageIndices());
    itineraryPages.forEach((page) => mergedPdf.addPage(page));
    console.log(`Added ${itineraryPages.length} pages from main itinerary`);
    
    // Static PDF files to append (in order)
    const staticPdfs = ['payments.pdf', 'cancellation-policy.pdf', 'faq.pdf'];
    const pagesFolder = path.join(__dirname, process.env.STATIC_PAGES_PATH || 'public/uploads/pages');
    
    console.log(`Looking for static PDFs in: ${pagesFolder}`);
    
    // A4 dimensions in points (1 point = 1/72 inch)
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    
    // Append each static PDF with A4 scaling
    for (const fileName of staticPdfs) {
      const filePath = path.join(pagesFolder, fileName);
      
      console.log(`\nProcessing: ${fileName}`);
      console.log(`Full path: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        try {
          const fileStats = fs.statSync(filePath);
          console.log(`File exists - Size: ${fileStats.size} bytes`);
          
          if (fileStats.size === 0) {
            console.warn(`Skipping ${fileName} - file is empty`);
            continue;
          }
          
          console.log(`Reading file: ${fileName}`);
          const staticPdfBuffer = fs.readFileSync(filePath);
          console.log(`Buffer length: ${staticPdfBuffer.length}`);
          
          console.log(`Loading PDF document: ${fileName}`);
          const staticPdf = await PDFDocument.load(staticPdfBuffer);
          console.log(`PDF loaded successfully: ${fileName}`);
          
          // Process each page of the static PDF
          const staticPageIndices = staticPdf.getPageIndices();
          console.log(`Found ${staticPageIndices.length} pages in ${fileName}`);
          
          if (staticPageIndices.length === 0) {
            console.warn(`Skipping ${fileName} - no pages found`);
            continue;
          }
          
          const staticPages = await mergedPdf.copyPages(staticPdf, staticPageIndices);
          console.log(`Copied ${staticPages.length} pages from ${fileName}`);
          
          staticPages.forEach((page, pageIndex) => {
            try {
              // Get original page dimensions
              const { width: originalWidth, height: originalHeight } = page.getSize();
              
              console.log(`Original size of ${fileName} page ${pageIndex + 1}: ${originalWidth} x ${originalHeight}`);
              
              // Validate dimensions
              if (!originalWidth || !originalHeight || originalWidth <= 0 || originalHeight <= 0) {
                console.error(`Invalid dimensions for ${fileName} page ${pageIndex + 1}`);
                return;
              }
              
              // Calculate scale factor to fit A4 while maintaining aspect ratio
              const scaleX = A4_WIDTH / originalWidth;
              const scaleY = A4_HEIGHT / originalHeight;
              const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit within bounds
              
              // Calculate new dimensions
              const newWidth = originalWidth * scale;
              const newHeight = originalHeight * scale;
              
              // Calculate centering offsets
              const offsetX = (A4_WIDTH - newWidth) / 2;
              const offsetY = (A4_HEIGHT - newHeight) / 2;
              
              console.log(`Scaling ${fileName} page ${pageIndex + 1} by ${scale.toFixed(3)} to ${newWidth.toFixed(1)} x ${newHeight.toFixed(1)}`);
              
              // Create new A4 page
              const newPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
              
              // Draw the scaled page centered on the new A4 page
              newPage.drawPage(page, {
                x: offsetX,
                y: offsetY,
                width: newWidth,
                height: newHeight,
              });
              
              console.log(`Successfully added page ${pageIndex + 1} from ${fileName}`);
            } catch (pageError) {
              console.error(`Error processing page ${pageIndex + 1} of ${fileName}:`, pageError.message);
            }
          });
          
        } catch (fileError) {
          console.error(`Error processing ${fileName}:`, fileError.message);
          console.error('Full error:', fileError);
          continue; // Skip this file and continue with next
        }
        
      } else {
        console.warn(`Static PDF not found: ${filePath}`);
      }
    }
    
    console.log('Finalizing merged PDF...');
    // Return the merged PDF as buffer
    const mergedPdfBytes = await mergedPdf.save();
    console.log(`Merged PDF created successfully - Size: ${mergedPdfBytes.length} bytes`);
    return Buffer.from(mergedPdfBytes);
    
  } catch (error) {
    console.error('Error merging PDFs:', error);
    console.error('Full error stack:', error.stack);
    throw error;
  }
};

// CORS Configuration - IMPORTANT for Render deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow your frontend URL and localhost for development
    const allowedOrigins = [
      'https://travel-itinerary-frontend-bsw1.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now - you can restrict later
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use('/public', express.static('public'));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body keys:', Object.keys(req.body));
  }
  next();
});

// Configure multer for file uploads (company logos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Travel Itinerary Generator API',
    status: 'Running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Check default logo endpoint
app.get('/api/check-logo', (req, res) => {
  console.log('Checking logo endpoint called');
  const logoPath = getDefaultLogoPath();
  res.json({ 
    hasLogo: logoPath !== null, 
    logoPath: logoPath 
  });
});

// Upload logo endpoint
app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
  try {
    console.log('Logo upload endpoint called');
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      message: 'Logo uploaded successfully',
      filename: req.file.filename,
      path: `/public/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Generate PDF endpoint - MAIN FUNCTIONALITY
app.post('/api/generate-pdf', async (req, res) => {
  console.log('=== PDF Generation Request Started ===');
  
  try {
    const tripData = req.body;
    console.log('Received trip data keys:', Object.keys(tripData));
    console.log('Customer name:', tripData.customerName);
    console.log('Destination:', tripData.destination);

    // Validate required fields
    if (!tripData.customerName || !tripData.destination) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Customer name and destination are required',
        received: {
          customerName: !!tripData.customerName,
          destination: !!tripData.destination
        }
      });
    }

    // Get default logo path for PDF
    const logoPath = getDefaultLogoPath();
    console.log('Logo path:', logoPath);

    // Read HTML template
    const templatePath = path.join(__dirname, 'templates', 'itinerary-template.html');
    console.log('Template path:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }
    
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log('Template loaded, length:', htmlTemplate.length);

    // Replace template variables with actual data
    htmlTemplate = htmlTemplate.replace(/{{customerName}}/g, tripData.customerName || '');
    htmlTemplate = htmlTemplate.replace(/{{destination}}/g, tripData.destination || '');
    htmlTemplate = htmlTemplate.replace(/{{startDate}}/g, tripData.startDate || '');
    htmlTemplate = htmlTemplate.replace(/{{endDate}}/g, tripData.endDate || '');
    htmlTemplate = htmlTemplate.replace(/{{adultsCount}}/g, tripData.adultsCount || '0');
    htmlTemplate = htmlTemplate.replace(/{{childrenCount}}/g, tripData.childrenCount || '0');
    htmlTemplate = htmlTemplate.replace(/{{inclusions}}/g, tripData.inclusions || '');
    htmlTemplate = htmlTemplate.replace(/{{exclusions}}/g, tripData.exclusions || '');
    htmlTemplate = htmlTemplate.replace(/{{additionalNotes}}/g, tripData.additionalNotes || '');

    // Handle daily itinerary with logos on every page break
    let itineraryHtml = '';
    if (tripData.dailyItinerary && tripData.dailyItinerary.length > 0) {
      console.log('Processing daily itinerary:', tripData.dailyItinerary.length, 'days');
      
      tripData.dailyItinerary.forEach((day, index) => {
        // Estimate content length to determine if we need a page break
        const titleLength = day.title ? day.title.length : 0;
        const descriptionLength = day.description ? day.description.length : 0;
        const totalContentLength = titleLength + descriptionLength;
        
        // Add page break class for days with lots of content (over 500 characters)
        // or for every 3rd day to prevent overcrowding
        const shouldPageBreak = totalContentLength > 500 || (index > 0 && index % 3 === 0);
        
        // Force logo on EVERY page break (except first day)
        if (index > 0 && (shouldPageBreak || index % 2 === 0)) {
          console.log(`Adding logo before Day ${day.dayNumber} (index: ${index})`);
          itineraryHtml += `
            <div style="page-break-before: always; padding-top: 20px;">
              <img src="${logoPath}" alt="Company Logo" style="max-width: 180px; max-height: 60px; object-fit: contain; margin-bottom: 20px; display: block;">
            </div>
          `;
        }
        
        itineraryHtml += `
          <div class="day-item" style="page-break-inside: avoid;">
            <div class="day-number">Day ${day.dayNumber}</div>
            ${day.title ? `<div class="day-title">${day.title}</div>` : ''}
            ${day.description ? `<div class="day-description">${day.description.replace(/\n/g, '<br>')}</div>` : ''}
          </div>
        `;
      });
    }
    htmlTemplate = htmlTemplate.replace(/{{#each dailyItinerary}}[\s\S]*?{{\/each}}/g, itineraryHtml);

    // Handle conditional sections
    htmlTemplate = htmlTemplate.replace(/{{#if inclusions}}([\s\S]*?){{\/if}}/g, 
      tripData.inclusions ? '$1' : '');
    htmlTemplate = htmlTemplate.replace(/{{#if exclusions}}([\s\S]*?){{\/if}}/g, 
      tripData.exclusions ? '$1' : '');
    htmlTemplate = htmlTemplate.replace(/{{#if additionalNotes}}([\s\S]*?){{\/if}}/g, 
      tripData.additionalNotes ? '$1' : '');
    
    // Handle logo conditional display
    if (logoPath) {
      // Use HTTP URL for logo
      htmlTemplate = htmlTemplate.replace(/{{#if companyLogo}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, '$1');
      htmlTemplate = htmlTemplate.replace(/{{companyLogo}}/g, logoPath);
      console.log('Using logo URL:', logoPath);
    } else {
      // Replace logo conditional with fallback content (company name)
      htmlTemplate = htmlTemplate.replace(/{{#if companyLogo}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, '$2');
      console.log('No logo found, using company name fallback');
    }

    // Launch Puppeteer and generate PDF
    const puppeteer = require('puppeteer');
    console.log('Launching Puppeteer...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    console.log('Setting page content...');
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    console.log('Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20px',     // Consistent margins, no fixed headers
        right: '15px',   // Small margin from page edge
        bottom: '40px',  // Bottom margin
        left: '15px'     // Small margin from page edge
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });
    
    await browser.close();
    console.log('Base PDF generated successfully, size:', pdf.length);

    // Try to merge with static pages, but don't fail if it doesn't work
    let finalPdf = pdf;
    
    try {
      console.log('Attempting to merge with static PDF pages...');
      finalPdf = await mergePDFs(pdf);
      console.log('PDF merging completed successfully');
    } catch (mergeError) {
      console.warn('PDF merge failed, using original PDF:', mergeError.message);
      // Continue with original PDF
    }

    // Send PDF response
    const filename = `itinerary-${tripData.customerName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    console.log('Sending PDF response, filename:', filename);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', finalPdf.length);
    res.send(finalPdf);
    
    console.log('=== PDF Generation Request Completed Successfully ===');

  } catch (error) {
    console.error('=== PDF Generation Error ===');
    console.error('Error generating PDF:', error);
    console.error('Full error stack:', error.stack);
    console.error('=== End PDF Generation Error ===');
    
    res.status(500).json({ 
      error: 'Failed to generate PDF: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ 
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Visit ${SERVER_URL} to test the API`);
  console.log('=================================');
});