import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Layout from '../components/common/Layout';
import { documentsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff', '.tif'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const { data } = await documentsApi.upload(formData);
      clearInterval(progressInterval);
      setProgress(100);

      toast.success('Document uploaded! AI analysis started.');
      setTimeout(() => navigate(`/documents/${data.document.id}`), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Layout title="Upload Document">
      <div className="max-w-2xl mx-auto">
        <p className="text-gray-600 mb-6">
          Upload a document for AI-powered analysis. Supported formats: PDF, DOCX, DOC, JPEG, PNG, TIFF.
          Maximum size: 50 MB.
        </p>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="text-5xl mb-4">📄</div>
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop the file here</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900 mb-2">Drag & drop your document</p>
              <p className="text-gray-500">or <span className="text-blue-600 font-medium">browse to upload</span></p>
            </>
          )}
        </div>

        {fileRejections.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            {fileRejections.map(({ file, errors }) => (
              <p key={file.name} className="text-sm text-red-700">
                {file.name}: {errors.map(e => e.message).join(', ')}
              </p>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
              <p className="text-sm text-gray-500">{progress}%</p>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 card">
          <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span className="font-medium text-blue-600">1.</span> Document is securely uploaded to AWS S3</li>
            <li className="flex gap-2"><span className="font-medium text-blue-600">2.</span> Google Cloud Vision extracts text via OCR</li>
            <li className="flex gap-2"><span className="font-medium text-blue-600">3.</span> OpenAI GPT-4 analyzes the document</li>
            <li className="flex gap-2"><span className="font-medium text-blue-600">4.</span> Risk assessment, clause analysis, and suggestions are generated</li>
            <li className="flex gap-2"><span className="font-medium text-blue-600">5.</span> You can optionally request notarization</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
