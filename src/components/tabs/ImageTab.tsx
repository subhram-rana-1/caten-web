'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { validateImageFile, formatFileSize } from '@/lib/utils';
import LoadingSpinner from '../LoadingSpinner';

interface ImageTabProps {
  onImageProcessed: (text: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ImageTab: React.FC<ImageTabProps> = ({
  onImageProcessed,
  onError,
  isLoading,
  setIsLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const validation = validateImageFile(file);
    
    if (!validation.isValid) {
      onError(validation.error!);
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/image-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text) {
        onImageProcessed(data.text);
      } else {
        throw new Error('No text extracted from image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      onError('Failed to extract text from image. Please try again.');
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [onImageProcessed, onError, setIsLoading]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile, isLoading]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile, isLoading]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleBrowseClick = () => {
    if (isLoading) return;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    fileInput?.click();
  };

  return (
    <div className="space-y-6">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
          dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-300'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic"
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner size="lg" text="Processing image..." />
          </div>
        ) : selectedFile ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-4 w-full max-w-md">
              <ImageIcon className="h-8 w-8 text-primary-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-600">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearFile}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary-50 rounded-full">
              <Upload className="h-8 w-8 text-primary-500" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Drop, Upload or Paste Image containing texts
              </h3>
              <p className="text-sm text-gray-600">
                Supporting formats: JPG, PNG, JPEG, HEIC
              </p>
            </div>

            <Button 
              onClick={handleBrowseClick}
              className="mt-4"
              leftIcon={<ImageIcon className="h-4 w-4" />}
            >
              Browse
            </Button>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-500">
        Maximum file size: 5MB
      </div>
    </div>
  );
};

export default ImageTab;
