'use client';

import { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { DocumentType } from '@/lib/types';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader } from 'lucide-react';

// Helper function for UUID generation
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DOCUMENT_TYPES: DocumentType[] = [
  'ITP',
  'RCA',
  'Revizie Tehnica',
  'Carnet Prometeu',
  'Certificat Echilibru',
  'Asigurare Marfa',
  'Certificat Geumatic',
  'Alte Documente'
];

interface DocumentForm {
  type: DocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  ocrConfidence?: 'high' | 'medium' | 'low';
}

interface UploadedFile {
  name: string;
  data: DocumentForm;
  processing: boolean;
  error?: string;
}

interface BulkUploadModalProps {
  trailerId: string;
  onClose: () => void;
}

// Mock OCR function to simulate document analysis
const mockOCRProcess = async (fileName: string): Promise<DocumentForm> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));

  // Mock OCR extraction based on file name patterns
  const typePatterns: Record<string, DocumentType> = {
    itp: 'ITP',
    rca: 'RCA',
    revizie: 'Revizie Tehnica',
    carnet: 'Carnet Prometeu',
    echilibru: 'Certificat Echilibru',
  };

  let detectedType: DocumentType = 'Alte Documente';
  for (const [pattern, type] of Object.entries(typePatterns)) {
    if (fileName.toLowerCase().includes(pattern)) {
      detectedType = type;
      break;
    }
  }

  const issueDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    .toISOString().split('T')[0];
  const expiryDate = new Date(2026, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    .toISOString().split('T')[0];

  return {
    type: detectedType,
    number: `RO-2024-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
    issueDate,
    expiryDate,
    ocrConfidence: Math.random() > 0.3 ? 'high' : 'medium',
  };
};

export default function BulkUploadModal({ trailerId, onClose }: BulkUploadModalProps) {
  const { addDocument } = useApp();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: FileList) => {
    setIsDragging(false);
    setIsProcessing(true);

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newFiles.push({
        name: file.name,
        data: {
          type: 'Alte Documente',
          number: '',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        },
        processing: true,
      });
    }

    setUploadedFiles(newFiles);

    // Process each file with OCR
    for (let i = 0; i < newFiles.length; i++) {
      try {
        const ocrData = await mockOCRProcess(newFiles[i].name);
        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            data: ocrData,
            processing: false,
          };
          return updated;
        });
      } catch (error) {
        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            processing: false,
            error: 'Eroare în procesare OCR',
          };
          return updated;
        });
      }
    }

    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const updateDocument = (index: number, field: keyof DocumentForm, value: string) => {
    const newFiles = [...uploadedFiles];
    newFiles[index].data = { ...newFiles[index].data, [field]: value as any };
    setUploadedFiles(newFiles);

    // Clear error for this field
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const validateForms = (): boolean => {
    const newErrors: Record<number, string> = {};

    uploadedFiles.forEach((file, index) => {
      if (!file.data.number.trim()) {
        newErrors[index] = 'Completați numărul documentului';
      } else if (!file.data.issueDate) {
        newErrors[index] = 'Selectați data emiterii';
      } else if (!file.data.expiryDate) {
        newErrors[index] = 'Selectați data expirării';
      } else if (new Date(file.data.issueDate) > new Date(file.data.expiryDate)) {
        newErrors[index] = 'Data expirării trebuie să fie după data emiterii';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForms()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    uploadedFiles.forEach(file => {
      addDocument(trailerId, {
        id: `doc-${uuidv4()}`,
        trailerId,
        type: file.data.type,
        number: file.data.number,
        issueDate: file.data.issueDate,
        expiryDate: file.data.expiryDate,
        fileUrl: `mock://file/${file.data.number.replace(/\s/g, '-')}.pdf`,
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'NORMAL',
      });
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Încarcă Documente</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={isProcessing || isSubmitting}
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6">
          {uploadedFiles.length === 0 ? (
            // Drag and Drop Zone
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trageți documentele aici</h3>
              <p className="text-gray-600 mb-4">sau</p>
              <label className="inline-block">
                <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                  Selectați fișiere
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
              <p className="text-sm text-gray-500 mt-4">Suportate: PDF, JPG, PNG</p>
            </div>
          ) : (
            // Uploaded Files List
            <div className="space-y-6">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-6 transition-colors ${
                    file.error ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* File Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {file.processing ? (
                        <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                      ) : file.error ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                        {file.data.ocrConfidence && (
                          <p className="text-xs text-gray-600">
                            OCR Încredere: <span className="font-medium">{file.data.ocrConfidence === 'high' ? 'Înaltă' : file.data.ocrConfidence === 'medium' ? 'Medie' : 'Joasă'}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors flex-shrink-0"
                      disabled={file.processing || isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {file.error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                      {file.error}
                    </div>
                  )}

                  {/* Document Fields */}
                  {!file.processing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tip Document
                        </label>
                        <select
                          value={file.data.type}
                          onChange={(e) => updateDocument(index, 'type', e.target.value as DocumentType)}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          {DOCUMENT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Document Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Număr Document
                        </label>
                        <input
                          type="text"
                          value={file.data.number}
                          onChange={(e) => updateDocument(index, 'number', e.target.value)}
                          placeholder="ex: RO-2024-001234"
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>

                      {/* Issue Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data Emiterii
                        </label>
                        <input
                          type="date"
                          value={file.data.issueDate}
                          onChange={(e) => updateDocument(index, 'issueDate', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data Expirării
                        </label>
                        <input
                          type="date"
                          value={file.data.expiryDate}
                          onChange={(e) => updateDocument(index, 'expiryDate', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errors[index] && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {errors[index]}
                    </div>
                  )}
                </div>
              ))}

              {/* Add More Files Button */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.jpg,.jpeg,.png';
                  input.onchange = (e) => {
                    if (e.target instanceof HTMLInputElement && e.target.files) {
                      processFiles(e.target.files);
                    }
                  };
                  input.click();
                }}
                disabled={isProcessing || isSubmitting}
                className="w-full py-2 px-4 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                Adaugă mai multe documente
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing || isSubmitting}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anulare
            </button>
            {uploadedFiles.length > 0 && (
              <button
                type="submit"
                disabled={isSubmitting || uploadedFiles.some(f => f.processing)}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Se procesează...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirma Incarcarea
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
