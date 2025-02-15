import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, Loader, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../components/auth/AuthProvider';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { Jimp } from 'jimp';
import { parse } from 'date-fns';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  content: {
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.2)',
    backgroundColor: '#fff',
    maxWidth: '500px',
    margin: '40px auto',
  },
};

interface ExtractedData {
  total?: string;
  date?: string;
  merchant?: string;
  category?: string;
}

const CLOUDINARY_UPLOAD_PRESET = 'expense_receipts';
const CLOUDINARY_CLOUD_NAME = 'dlhsijfkr';


const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Groceries',
  'Other'
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'food'],
  'Transportation': ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'transit', 'parking'],
  'Shopping': ['mall', 'store', 'retail', 'market', 'shop', 'boutique'],
  'Entertainment': ['cinema', 'movie', 'theater', 'concert', 'show'],
  'Bills & Utilities': ['utility', 'electric', 'water', 'gas', 'internet', 'phone'],
  'Healthcare': ['pharmacy', 'doctor', 'medical', 'clinic', 'hospital', 'drug'],
  'Travel': ['hotel', 'airline', 'flight', 'booking', 'travel'],
  'Groceries': ['grocery', 'supermarket', 'market', 'foods', 'wholesale']
};

Modal.setAppElement('#root');

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showExpensePrompt, setShowExpensePrompt] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Other');
  const [publicId, setPublicId] = useState<string | null>(null);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    if (file.type === 'image/webp') {
      toast.error('WebP images are not supported. Please upload a PNG, JPEG, or JPG image.');
      return '';
    }


    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload image to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  };

  // const deleteFromCloudinary = async (publicId: string) => {
  //   try {
  //     const formData = new FormData();
  //     formData.append('public_id', publicId);
  //     formData.append('api_key', CLOUDINARY_API_KEY);
  //     formData.append('api_secret', CLOUDINARY_API_SECRET);
  //     formData.append('timestamp', Math.floor(Date.now() / 1000).toString());

  //     const response = await fetch(
  //       `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
  //       {
  //         method: 'POST',
  //         body: formData,
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error('Failed to delete image from Cloudinary');
  //     }

  //     const data = await response.json();
  //     console.log('Image deleted:', data);
  //   } catch (error) {
  //     console.error('Error deleting image:', error);
  //   }
  // };


  const detectCategory = (text: string, merchantName?: string): string => {
    const lowercaseText = (text + ' ' + merchantName).toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  };

  const preprocessImage = async (imageUrl: string): Promise<string> => {
    try {
      const image = await Jimp.read(imageUrl);
      image
        .greyscale()
        .contrast(1)
        .resize({ w: 800 });
      const processedImageUrl = image.getBase64("image/jpeg");
      return processedImageUrl;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      throw error;
    }
  };

  const processReceipt = async (imageUrl: string): Promise<ExtractedData> => {
    const worker = await createWorker();

    const processedImageUrl = await preprocessImage(imageUrl);
    const { data: { text } } = await worker.recognize(processedImageUrl);
    await worker.terminate();

    console.log('OCR Output:', text);

    const totalPattern = /(?:total amount|amount due|grand total|final amount|total|amount)[:\s]*[$€£₹]?\s*(\d+\.?\d*)/i;
    const datePattern = /(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})|(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/;
    const merchantPattern = /^([A-Za-z\s]+)/;

    const totalMatch = text.match(totalPattern);
    const dateMatch = text.match(datePattern);
    const merchantMatch = text.match(merchantPattern);
    const merchant = merchantMatch?.[1]?.trim() || 'Unknown Merchant';

    let date = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      try {
        const parsedDate = parse(dateMatch[0], 'dd.MM.yy', new Date());
        date = parsedDate.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }

    const category = detectCategory(text, merchant);
    setSelectedCategory(category);

    return {
      total: totalMatch?.[1],
      date,
      merchant,
      category
    };
  };

  const saveExpense = async () => {

    if (!user || !extractedData) return;

    try {
      let date = new Date().toISOString().split('T')[0];
      if (extractedData.date) {
        try {
          const parsedDate = new Date(extractedData.date);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }

      const expenseData = {
        amount: parseFloat(extractedData.total || '0'),
        category: selectedCategory,
        date,
        description: extractedData.merchant || 'Receipt Expense',
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      console.log('Saving Expense:', expenseData);

      const docRef = await addDoc(collection(db, 'expenses'), expenseData);
      console.log('Expense added with ID:', docRef.id);


      setPublicId(null);
      setPreview(null);

      toast.success('Expense added successfully');
      setShowExpensePrompt(false);
      setShowViewExpensesModal(true);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleViewExpenses = () => {
    navigate('/expenses');
    setShowViewExpensesModal(false);
  };

  const handleCancelViewExpenses = async () => {
    if (publicId) {

      setPublicId(null);
      setPreview(null);
    }
    setShowViewExpensesModal(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    if (!user) return;

    if (fileRejections.length > 0) {
      toast.error('Unsupported file type. Please upload a PNG, JPEG, JPG, or WebP image.');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      setUploading(true);
      const imageUrl = await uploadToCloudinary(file);

      const receiptRef = await addDoc(collection(db, 'receipts'), {
        userId: user.uid,
        imageUrl,
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        fileName: file.name
      });

      setProcessing(true);
      const extractedData = await processReceipt(objectUrl);
      setExtractedData(extractedData);

      await updateDoc(doc(db, 'receipts', receiptRef.id), {
        status: 'completed',
        extractedData,
        processedAt: new Date().toISOString()
      });

      toast.success('Receipt processed successfully');
      setShowExpensePrompt(true);
    } catch (error) {
      console.error('Error processing receipt:', error);
      toast.error('Failed to process receipt');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }, [user, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpeg', '.jpg'],
      // 'image/webp': ['.webp']
    },
    maxFiles: 1
  });

  const [showViewExpensesModal, setShowViewExpensesModal] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Upload Receipt
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
              : 'border-gray-300 dark:border-gray-700'
            }`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isDragActive
              ? 'Drop the receipt here'
              : 'Drag and drop a receipt, or click to select'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Supported formats: PNG, JPEG, JPG
          </p>
        </div>

        {(uploading || processing) && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader className="animate-spin" />
            <span>{processing ? 'Processing receipt...' : 'Uploading...'}</span>
          </div>
        )}

        {extractedData && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Extracted Data
            </h3>
            <div className="space-y-4">
              <dl className="space-y-2">
                {extractedData.total && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Total:</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      ${extractedData.total}
                    </dd>
                  </div>
                )}
                {extractedData.date && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Date:</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {extractedData.date}
                    </dd>
                  </div>
                )}
                {extractedData.merchant && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Merchant:</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {extractedData.merchant}
                    </dd>
                  </div>
                )}
              </dl>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {showExpensePrompt && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowExpensePrompt(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveExpense}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add as Expense
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="max-w-sm mx-auto rounded-lg shadow-md"
            />
          </div>
        )}
      </div>
      <Modal
        isOpen={showViewExpensesModal}
        onRequestClose={handleCancelViewExpenses}
        className="flex flex-col items-center overl"
        style={customStyles}
        contentLabel="View Expenses Modal"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex justify-center w-[100%] items-center ">
            <h2 className="justify-center text-xl font-bold text-gray-900 dark:text-white">Expense Saved!</h2>
          </div>
          <button
            type="button"
            className="text-3xl items-center justify-center text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-400"
            onClick={handleCancelViewExpenses}
          >
            ×
          </button>
        </div>
        <div className="text-center mt-4">
          <p>Would you like to view your expenses?</p>
        </div>
        <div className="flex justify-center mt-4">
          <button
            type="button"
            className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md"
            onClick={handleViewExpenses}
          >
            View Expenses
          </button>
          <button
            type="button"
            className="ml-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            onClick={handleCancelViewExpenses}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}