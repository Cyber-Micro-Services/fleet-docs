import { Document, Trailer, DocumentType, AlertStatus } from './types';

// Helper function to calculate document status based on expiry date
function calculateDocumentStatus(expiryDate: string): AlertStatus {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry <= 14) return 'URGENT'; // 2 weeks
  if (daysUntilExpiry <= 30) return 'ALERT';   // 1 month
  if (daysUntilExpiry <= 60) return 'WARNING'; // 2 months
  return 'NORMAL';
}

// Helper to calculate urgency score (0-100)
function calculateUrgencyScore(documents: Document[]): number {
  if (documents.length === 0) return 0;

  const statusWeights = {
    EXPIRED: 100,
    URGENT: 90,
    ALERT: 70,
    WARNING: 40,
    NORMAL: 0,
  };

  const totalScore = documents.reduce((sum, doc) => {
    return sum + statusWeights[doc.status];
  }, 0);

  return Math.min(100, Math.round(totalScore / documents.length));
}

// Mock documents for trailers - all documents complete and not urgent (Use Case 1: No attention needed)
const createMockDocumentsComplete = (trailerId: string): Document[] => {
  return [
    {
      id: `doc-${trailerId}-1`,
      trailerId,
      type: 'ITP',
      number: 'RO-2024-001234',
      issueDate: '2023-03-15',
      expiryDate: '2027-03-15',
      fileUrl: 'mock://file/itp.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-2`,
      trailerId,
      type: 'RCA',
      number: 'POL-2024-567890',
      issueDate: '2023-09-20',
      expiryDate: '2027-01-20',
      fileUrl: 'mock://file/rca.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-3`,
      trailerId,
      type: 'Revizie Tehnica',
      number: 'REV-2024-111111',
      issueDate: '2023-06-01',
      expiryDate: '2027-06-01',
      fileUrl: 'mock://file/revizie.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-4`,
      trailerId,
      type: 'Carnet Prometeu',
      number: 'PROM-2024-222222',
      issueDate: '2022-12-01',
      expiryDate: '2027-02-10',
      fileUrl: 'mock://file/carnet.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-5`,
      trailerId,
      type: 'Certificat Echilibru',
      number: 'ECH-2024-333333',
      issueDate: '2023-01-15',
      expiryDate: '2027-12-20',
      fileUrl: 'mock://file/echilibru.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
  ];
};

// Mock documents for trailers with some documents needing attention (Use Case 2: Some documents expired/alert)
const createMockDocumentsMixed = (trailerId: string): Document[] => {
  return [
    {
      id: `doc-${trailerId}-1`,
      trailerId,
      type: 'ITP',
      number: 'RO-2024-001234',
      issueDate: '2023-03-15',
      expiryDate: '2026-03-15',
      fileUrl: 'mock://file/itp.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-2`,
      trailerId,
      type: 'RCA',
      number: 'POL-2024-567890',
      issueDate: '2023-09-20',
      expiryDate: '2024-11-15',
      fileUrl: 'mock://file/rca.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
    {
      id: `doc-${trailerId}-3`,
      trailerId,
      type: 'Revizie Tehnica',
      number: 'REV-2024-111111',
      issueDate: '2023-06-01',
      expiryDate: '2025-03-10',
      fileUrl: 'mock://file/revizie.pdf',
      uploadedAt: '2024-01-10',
      status: 'ALERT',
    },
    {
      id: `doc-${trailerId}-4`,
      trailerId,
      type: 'Carnet Prometeu',
      number: 'PROM-2024-222222',
      issueDate: '2022-12-01',
      expiryDate: '2026-02-10',
      fileUrl: 'mock://file/carnet.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
    {
      id: `doc-${trailerId}-5`,
      trailerId,
      type: 'Certificat Echilibru',
      number: 'ECH-2024-333333',
      issueDate: '2023-01-15',
      expiryDate: '2026-12-20',
      fileUrl: 'mock://file/echilibru.pdf',
      uploadedAt: '2024-01-10',
      status: 'NORMAL',
    },
  ];
};

// Mock documents for trailer with all documents expired (Use Case 3: All documents expired - urgent attention)
const createMockDocumentsAllExpired = (trailerId: string): Document[] => {
  return [
    {
      id: `doc-${trailerId}-1`,
      trailerId,
      type: 'ITP',
      number: 'RO-2024-001234',
      issueDate: '2022-03-15',
      expiryDate: '2024-03-15',
      fileUrl: 'mock://file/itp.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
    {
      id: `doc-${trailerId}-2`,
      trailerId,
      type: 'RCA',
      number: 'POL-2024-567890',
      issueDate: '2022-09-20',
      expiryDate: '2024-09-20',
      fileUrl: 'mock://file/rca.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
    {
      id: `doc-${trailerId}-3`,
      trailerId,
      type: 'Revizie Tehnica',
      number: 'REV-2024-111111',
      issueDate: '2022-06-01',
      expiryDate: '2024-06-01',
      fileUrl: 'mock://file/revizie.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
    {
      id: `doc-${trailerId}-4`,
      trailerId,
      type: 'Carnet Prometeu',
      number: 'PROM-2024-222222',
      issueDate: '2021-12-01',
      expiryDate: '2024-12-01',
      fileUrl: 'mock://file/carnet.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
    {
      id: `doc-${trailerId}-5`,
      trailerId,
      type: 'Certificat Echilibru',
      number: 'ECH-2024-333333',
      issueDate: '2022-01-15',
      expiryDate: '2024-12-20',
      fileUrl: 'mock://file/echilibru.pdf',
      uploadedAt: '2024-01-10',
      status: 'EXPIRED',
    },
  ];
};

// Generate mock trailers
export const generateMockTrailers = (): Trailer[] => {
  const trailers: Trailer[] = [];

  const registrationNumbers = [
    'B-TR-001', 'B-TR-002', 'B-TR-003', 'B-TR-004', 'B-TR-005',
    'CJ-TR-006', 'CJ-TR-007', 'IS-TR-008', 'TM-TR-009', 'PH-TR-010'
  ];

  const types = ['Semiremorcă Plateau', 'Semiremorcă Furgon', 'Semiremorcă Cisternă', 'Remorcă Platformă'];
  const manufacturers = ['Schmitz Cargobull', 'Wabash', 'Kogel', 'Krone', 'Wielton'];

  registrationNumbers.forEach((regNumber, index) => {
    let documents;
    
    // Use Case 1: First 5 trailers - all documents in NORMAL status (no attention needed)
    if (index < 5) {
      documents = createMockDocumentsComplete(`trailer-${index}`);
    }
    // Use Case 2: Next 4 trailers - some documents expired or needing attention
    else if (index < 9) {
      documents = createMockDocumentsMixed(`trailer-${index}`);
    }
    // Use Case 3: Last 1 trailer - all 5 documents expired (urgent attention needed)
    else {
      documents = createMockDocumentsAllExpired(`trailer-${index}`);
    }
    
    // Update document statuses
    documents.forEach(doc => {
      doc.status = calculateDocumentStatus(doc.expiryDate);
    });

    trailers.push({
      id: `trailer-${index}`,
      registrationNumber: regNumber,
      type: types[index % types.length],
      manufacturer: manufacturers[index % manufacturers.length],
      year: 2020 + (index % 4),
      documents,
      urgencyScore: 0, // Will be calculated
    });
  });

  // Calculate urgency scores
  trailers.forEach(trailer => {
    trailer.urgencyScore = calculateUrgencyScore(trailer.documents);
  });

  return trailers;
};

export { calculateDocumentStatus, calculateUrgencyScore };
