'use client';

import { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { DocumentType, DocumentUploadResponse } from '@/lib/types';
import { calculateDocumentStatus } from '@/lib/mock-data';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader } from 'lucide-react';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DOCUMENT_TYPES: DocumentType[] = [
  'ITP',
  'RCA',
  'Revizie Tehnica',
  'Carnet Prometeu',
  'Certificat Echilibru',
  'Asigurare Marfa',
  'Certificat Geumatic',
  'Alte Documente',
];

interface DocumentForm {
  type: DocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  ocrConfidence?: 'high' | 'medium' | 'low';
}

interface UploadedFile {
  file: File;
  name: string;
  data: DocumentForm;
  processing: boolean;
  error?: string;
  ocrWarning?: string;
}

interface BulkUploadModalProps {
  trailerId: string;
  onClose: () => void;
}

type OcrPreviewResult = Partial<DocumentForm>;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return undefined;
}

function toConfidence(confidence: unknown): DocumentForm['ocrConfidence'] {
  if (typeof confidence !== 'number') return undefined;
  const value = confidence > 1 ? confidence / 100 : confidence;
  if (value >= 0.8) return 'high';
  if (value >= 0.55) return 'medium';
  return 'low';
}

function detectDocumentType(rawValue?: string): DocumentType {
  if (!rawValue) return 'Alte Documente';
  const normalized = normalizeText(rawValue);

  const patterns: Array<{ pattern: RegExp; type: DocumentType }> = [
    { pattern: /\bitp\b|inspectie tehnica/, type: 'ITP' },
    { pattern: /\brca\b|asigurare auto/, type: 'RCA' },
    { pattern: /revizie/, type: 'Revizie Tehnica' },
    { pattern: /carnet/, type: 'Carnet Prometeu' },
    { pattern: /echilibru/, type: 'Certificat Echilibru' },
    { pattern: /marfa/, type: 'Asigurare Marfa' },
    { pattern: /geumatic/, type: 'Certificat Geumatic' },
  ];

  for (const { pattern, type } of patterns) {
    if (pattern.test(normalized)) return type;
  }

  return 'Alte Documente';
}

function getStringField(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function getNestedObject(
  source: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = source[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function mapExtractedFields(payload: Record<string, unknown>): Map<string, string> {
  const result = new Map<string, string>();
  const extractedFields = payload.extractedFields;

  if (!Array.isArray(extractedFields)) {
    return result;
  }

  for (const field of extractedFields) {
    if (!field || typeof field !== 'object') continue;
    const name = (field as { name?: unknown }).name;
    const value = (field as { value?: unknown }).value;
    if (typeof name !== 'string' || typeof value !== 'string') continue;
    const normalizedName = normalizeText(name);
    if (normalizedName && value.trim()) {
      result.set(normalizedName, value.trim());
    }
  }

  return result;
}

function getKeyValuePairs(payload: Record<string, unknown>) {
  const rootPairs = payload.keyValuePairs;
  if (Array.isArray(rootPairs)) return rootPairs;

  const extracted = payload.ocrExtractedData;
  if (
    extracted &&
    typeof extracted === 'object' &&
    Array.isArray((extracted as { keyValuePairs?: unknown[] }).keyValuePairs)
  ) {
    return (extracted as { keyValuePairs: unknown[] }).keyValuePairs;
  }

  return [] as unknown[];
}

function mapKeyValues(payload: Record<string, unknown>): Map<string, string> {
  const result = new Map<string, string>();
  const pairs = getKeyValuePairs(payload);

  for (const pair of pairs) {
    if (!pair || typeof pair !== 'object') continue;
    const key = (pair as { key?: unknown }).key;
    const value = (pair as { value?: unknown }).value;
    if (typeof key !== 'string' || typeof value !== 'string') continue;
    const normalizedKey = normalizeText(key);
    if (normalizedKey && value.trim()) {
      result.set(normalizedKey, value.trim());
    }
  }

  return result;
}

function getMappedValue(
  keyValueMap: Map<string, string>,
  candidates: string[]
): string | undefined {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (keyValueMap.has(normalizedCandidate)) {
      return keyValueMap.get(normalizedCandidate);
    }
  }

  for (const [key, value] of keyValueMap.entries()) {
    if (candidates.some((candidate) => key.includes(normalizeText(candidate)))) {
      return value;
    }
  }

  return undefined;
}

async function runOcrPreview(
  file: File,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
): Promise<OcrPreviewResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await authFetch('/documents/ocr/analyze', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Nu ma pot conecta la serviciul OCR.');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage =
      payload &&
      typeof payload === 'object' &&
      typeof (payload as { message?: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : 'OCR-ul nu a putut analiza documentul.';
    throw new Error(apiMessage);
  }

  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const source = payload as Record<string, unknown>;
  const keyValueMap = mapKeyValues(source);
  const extractedFieldMap = mapExtractedFields(source);
  const extractedInfo = getNestedObject(source, 'extractedInfo') ?? {};

  const title =
    getStringField(source, ['title', 'documentTitle', 'number', 'documentNumber']) ??
    getStringField(extractedInfo, ['policyNumber', 'documentNumber', 'number', 'serialNumber']) ??
    getMappedValue(extractedFieldMap, ['policynumber', 'documentnumber', 'number']) ??
    getMappedValue(keyValueMap, [
      'titlu',
      'title',
      'numar document',
      'nr document',
      'numar',
      'document number',
      'serie',
    ]);

  const issueDate =
    normalizeDate(getStringField(source, ['issueDate', 'issuedAt', 'dateOfIssue'])) ??
    normalizeDate(getStringField(extractedInfo, ['issueDate', 'issuedAt'])) ??
    normalizeDate(
      getMappedValue(keyValueMap, [
        'data emiterii',
        'data emitere',
        'issue date',
        'date of issue',
        'emis la',
      ])
    );

  const expiryDate =
    normalizeDate(getStringField(source, ['expiryDate', 'expirationDate', 'validUntil'])) ??
    normalizeDate(getStringField(extractedInfo, ['expiryDate', 'expirationDate'])) ??
    normalizeDate(
      getMappedValue(keyValueMap, [
        'data expirarii',
        'data expirare',
        'expiry date',
        'expiration date',
        'valid until',
        'valabil pana',
      ])
    );

  const rawType =
    getStringField(source, ['type', 'documentType', 'category']) ??
    getStringField(extractedInfo, ['documentType', 'type']) ??
    getMappedValue(keyValueMap, ['tip document', 'document type', 'tip']);

  const rawText = getStringField(source, ['text']);

  const confidence =
    toConfidence(source.confidence) ??
    toConfidence(source.ocrConfidence) ??
    toConfidence(source.averageConfidence);

  return {
    type: detectDocumentType(rawType ?? rawText ?? file.name),
    number: title ?? '',
    issueDate: issueDate ?? '',
    expiryDate: expiryDate ?? '',
    ocrConfidence: confidence,
  };
}

export default function BulkUploadModal({ trailerId, onClose }: BulkUploadModalProps) {
  const { addDocument, uploadDocument, refreshTrailerDocuments, authFetch } = useApp();
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
      const defaultData: DocumentForm = {
        type: 'Alte Documente',
        number: '',
        issueDate: '',
        expiryDate: '',
      };

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        newFiles.push({
          file,
          name: file.name,
          data: defaultData,
          processing: false,
          error: 'Tip de fișier neacceptat. Sunt acceptate: PDF, PNG, JPG.',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        newFiles.push({
          file,
          name: file.name,
          data: defaultData,
          processing: false,
          error: 'Fișierul depășește dimensiunea maximă de 10MB.',
        });
        continue;
      }

      newFiles.push({
        file,
        name: file.name,
        data: defaultData,
        processing: true,
      });
    }

    setUploadedFiles(newFiles);

    // Pre-fill form fields via mock OCR for valid files only
    for (let i = 0; i < newFiles.length; i++) {
      if (newFiles[i].error || !newFiles[i].processing) continue;
      try {
        const ocrData = await runOcrPreview(newFiles[i].file, authFetch);
        setUploadedFiles((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            data: { ...updated[i].data, ...ocrData },
            processing: false,
            ocrWarning: undefined,
          };
          return updated;
        });
      } catch (err) {
        setUploadedFiles((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            processing: false,
            ocrWarning:
              err instanceof Error
                ? err.message
                : 'OCR preview indisponibil. Completeaza manual campurile.',
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

    if (!validateForms()) return;

    setIsSubmitting(true);
    const newErrors: Record<number, string> = {};
    const vehicleId = UUID_REGEX.test(trailerId) ? trailerId : undefined;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];
      if (uploadedFile.error) {
        newErrors[i] = uploadedFile.error;
        continue;
      }

      try {
        const response: DocumentUploadResponse = await uploadDocument(
          uploadedFile.file,
          {
            title: uploadedFile.data.number.trim() || uploadedFile.name,
            type: uploadedFile.data.type,
            issueDate: uploadedFile.data.issueDate,
            expiryDate: uploadedFile.data.expiryDate,
          },
          vehicleId
        );

        if (!vehicleId) {
          addDocument(trailerId, {
            id: response.id,
            trailerId,
            type: response.type as DocumentType,
            number: response.title,
            issueDate: response.issueDate,
            expiryDate: response.expiryDate,
            fileUrl: response.filePath ?? `/public/uploads/documents/${response.fileName ?? ''}`,
            uploadedAt: response.createdAt.split('T')[0],
            status: calculateDocumentStatus(response.expiryDate),
          });
        }
      } catch (err) {
        newErrors[i] = err instanceof Error ? err.message : 'Eroare la încărcarea documentului.';
      }
    }

    setIsSubmitting(false);

    if (vehicleId) {
      try {
        await refreshTrailerDocuments(trailerId);
      } catch {
        // Keep upload result visible even if refresh fails.
      }
    }

    if (Object.keys(newErrors).length === 0) {
      onClose();
    } else {
      setErrors(newErrors);
    }
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
                            OCR Încredere:{' '}
                            <span className="font-medium">
                              {file.data.ocrConfidence === 'high'
                                ? 'Înaltă'
                                : file.data.ocrConfidence === 'medium'
                                  ? 'Medie'
                                  : 'Joasă'}
                            </span>
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

                  {!file.error && file.ocrWarning && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                      {file.ocrWarning}
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
                          onChange={(e) =>
                            updateDocument(index, 'type', e.target.value as DocumentType)
                          }
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          {DOCUMENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Titlu
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
                disabled={isSubmitting || uploadedFiles.some((f) => f.processing)}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Se analizează documentul...
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
