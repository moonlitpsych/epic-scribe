import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface PresentationSectionProps {
  title: string;
  subtitle?: string;
  aiEnhanceable?: boolean;
  onEnhance?: () => void;
  isEnhancing?: boolean;
  aiEnhanced?: boolean;
  children: ReactNode;
  className?: string;
}

export function PresentationSection({
  title,
  subtitle,
  aiEnhanceable = false,
  onEnhance,
  isEnhancing = false,
  aiEnhanced = false,
  children,
  className = ''
}: PresentationSectionProps) {
  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          )}
        </div>
        {aiEnhanceable && onEnhance && (
          <button
            onClick={onEnhance}
            disabled={isEnhancing}
            className={`text-sm px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              aiEnhanced
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            } ${isEnhancing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isEnhancing ? 'Enhancing...' : aiEnhanced ? 'Re-enhance' : 'AI Enhance'}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

// Sub-components for common field types

interface TextAreaFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

export function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 3,
  label
}: TextAreaFieldProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
}

export function InputField({
  value,
  onChange,
  placeholder,
  label,
  type = 'text'
}: InputFieldProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
}

interface MedicationListProps {
  medications: string[];
  onChange: (medications: string[]) => void;
  label?: string;
}

export function MedicationList({
  medications,
  onChange,
  label
}: MedicationListProps) {
  const handleMedChange = (index: number, value: string) => {
    const updated = [...medications];
    if (value === '') {
      // Remove if empty
      updated.splice(index, 1);
    } else {
      updated[index] = value;
    }
    onChange(updated);
  };

  const addMedication = () => {
    onChange([...medications, '']);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {medications.map((med, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={med}
              onChange={(e) => handleMedChange(index, e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Medication name and dose"
            />
            <button
              onClick={() => handleMedChange(index, '')}
              className="text-red-600 hover:text-red-700 px-2"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addMedication}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Add medication
        </button>
      </div>
    </div>
  );
}