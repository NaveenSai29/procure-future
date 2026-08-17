'use client';

import { useState, useRef } from 'react';
import {
  Upload, Download, FileSpreadsheet, X, CheckCircle,
  AlertTriangle, XCircle, FileText, Loader2, Eye, ArrowRight,
  Info, FileCode, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import ImportProgress from './ImportProgress';
import ImportErrors from './ImportErrors';

export default function BulkImportDialog({ isOpen, onClose, onSuccess, mode = 'csv' }) {
  const [step, setStep] = useState('UPLOAD'); // UPLOAD, VALIDATING, VALIDATED, IMPORTING, COMPLETE
  const [file, setFile] = useState(null);
  const [importMode, setImportMode] = useState('CREATE');
  const [validateOnly, setValidateOnly] = useState(false);
  const [autoGenerateImages, setAutoGenerateImages] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error('File too large. Maximum 20MB allowed.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > 20 * 1024 * 1024) {
        toast.error('File too large. Maximum 20MB allowed.');
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setStep('VALIDATING');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('importMode', importMode);
    formData.append('validateOnly', 'true');

    try {
      const res = await fetch('/api/supplier/products/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setValidationResult(data);
        setStep('VALIDATED');
      } else {
        toast.error(data.error || 'Validation failed');
        setStep('UPLOAD');
      }
    } catch (error) {
      toast.error('Failed to validate file');
      setStep('UPLOAD');
    }
  };

  const handleImport = async () => {
    setStep('IMPORTING');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('importMode', importMode);
    formData.append('autoGenerateImages', autoGenerateImages ? 'true' : 'false');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const res = await fetch('/api/supplier/products/bulk', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (res.ok) {
        setImportResult(data);
        setStep('COMPLETE');
        toast.success(`Imported ${data.import.created} products successfully`);
        if (onSuccess) onSuccess(data);
      } else {
        setValidationResult(data);
        setStep('VALIDATED');
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      toast.error('Failed to import products');
      setStep('UPLOAD');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/supplier/products/bulk/template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleDownloadTallySample = async () => {
    try {
      const res = await fetch('/api/supplier/products/tally-template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tally-sample-export.xml';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tally sample downloaded');
    } catch (error) {
      toast.error('Failed to download Tally sample');
    }
  };

  const getStepIcon = (stepName) => {
    switch (stepName) {
      case 'VALIDATED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'COMPLETE': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'VALIDATING':
      case 'IMPORTING': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'tally' ? 'Import from Tally' : 'Bulk Import Products'}
              </h2>
              <p className="text-sm text-gray-500">
                {mode === 'tally' 
                  ? 'Upload Tally XML export file to import your products' 
                  : 'Import multiple products from CSV or Excel file'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tally Instructions Banner */}
          {mode === 'tally' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" /> How to Export from Tally
              </h4>
              <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                <li>Open Tally → Gateway of Tally</li>
                <li>Go to Display → Inventory Reports → Stock Summary</li>
                <li>Press <kbd className="bg-white px-1.5 py-0.5 rounded border text-[10px]">E</kbd> (Export)</li>
                <li>Select <strong>XML</strong> format</li>
                <li>Save the file and upload it here</li>
              </ol>
              <div className="bg-white rounded-lg p-3 text-xs text-blue-700">
                <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                Products will be imported as DRAFT. You can add images and submit for approval later.
              </div>
            </div>
          )}

          {/* Steps Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {['UPLOAD', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETE'].map((s, i) => {
                // Only show completed steps and current step
                const stepOrder = ['UPLOAD', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETE'];
                const currentIndex = stepOrder.indexOf(step);
                const stepIndex = stepOrder.indexOf(s);
                
                // Only show up to current step + next
                if (stepIndex > currentIndex + 1) return null;
                
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = s === step;
                const isFuture = stepIndex > currentIndex;
                
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isCompleted ? 'bg-green-100 text-green-700' :
                      isCurrent ? 'bg-blue-100 text-blue-700 animate-pulse' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isCurrent && (s === 'VALIDATING' || s === 'IMPORTING') ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : isCurrent ? (
                        <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">●</span>
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-xs text-gray-400">{i + 1}</span>
                      )}
                      <span className="hidden sm:inline">{s}</span>
                    </div>
                    {i < 4 && stepIndex < currentIndex + 1 && (
                      <div className={`h-0.5 w-4 rounded ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                );
              })}
            </div>

          {/* Upload Step */}
          {(step === 'UPLOAD' || step === 'VALIDATING') && (
            <div className="space-y-4">
              {/* Import Mode */}
              <div className="flex gap-3">
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="CREATE">Create New Products</option>
                  <option value="UPDATE">Update Existing (by SKU)</option>
                  <option value="UPSERT">Create & Update</option>
                </select>
              </div>

              {/* Auto-Generate Images Toggle */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateImages}
                    onChange={(e) => setAutoGenerateImages(e.target.checked)}
                    className="mt-1 h-4 w-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-800">
                        Auto-Generate Product Images
                      </span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Products without images will get AI-generated images automatically. 
                      Products with all mandatory fields will auto-submit for approval.
                    </p>
                  </div>
                </label>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 text-blue-500 mx-auto" />
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg text-gray-700">
                        Drag & drop your file here
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or click to browse
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Supported: CSV, Excel (.xlsx, .xls), Tally XML (.xml) - Max 20MB
                    </p>
                  </div>
                )}
              </div>

              {/* Download Template / Tally Sample */}
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </button>
                
                {mode === 'tally' && (
                  <button
                    onClick={handleDownloadTallySample}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <FileCode className="h-4 w-4" />
                    Download Tally Sample
                  </button>
                )}
              </div>

              {/* Validate Button */}
              {file && (
                <button
                  onClick={handleValidate}
                  disabled={step === 'VALIDATING'}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {step === 'VALIDATING' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Validate File
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Validation Results */}
          {step === 'VALIDATED' && validationResult && (
            <div className="space-y-4">
              <ImportProgress
                total={validationResult.summary.total}
                valid={validationResult.summary.valid}
                errors={validationResult.summary.errors}
                warnings={validationResult.summary.warnings}
              />

              {validationResult.errors.length > 0 && (
                <ImportErrors
                  errors={validationResult.errors}
                  title="Validation Errors"
                  type="error"
                />
              )}

              {validationResult.warnings.length > 0 && (
                <ImportErrors
                  errors={validationResult.warnings}
                  title="Warnings"
                  type="warning"
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('UPLOAD'); setFile(null); setValidationResult(null); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={validationResult.summary.valid === 0}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {validationResult.summary.valid} Products
                </button>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {step === 'IMPORTING' && (
            <div className="space-y-4 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Importing Products...</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {autoGenerateImages ? 'Importing and generating images...' : 'Please wait while we process your file'}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-500">{progress}% complete</p>
            </div>
          )}

          {/* Import Complete */}
          {step === 'COMPLETE' && importResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900">Import Complete!</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.import.created}</p>
                  <p className="text-sm text-green-700">Created</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResult.import.updated}</p>
                  <p className="text-sm text-blue-700">Updated</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{importResult.import.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
              </div>

              {/* Image Generation Results */}
              {importResult.images && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Image Generation
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    ✅ {importResult.images.generated} images generated
                    {importResult.images.failed > 0 && ` | ⚠️ ${importResult.images.failed} failed`}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Products with all mandatory fields have been auto-submitted for approval.
                  </p>
                </div>
              )}

              {importResult.import.errors.length > 0 && (
                <ImportErrors
                  errors={importResult.import.errors}
                  title="Import Errors"
                  type="error"
                />
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}