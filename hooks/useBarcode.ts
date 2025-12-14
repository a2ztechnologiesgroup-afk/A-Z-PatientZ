
import React, { useEffect, useRef } from 'react';

// Make JsBarcode available from the window object loaded via CDN
declare var JsBarcode: any;

export const useBarcode = <T extends SVGElement,>(
  ref: React.RefObject<T>,
  value: string,
  options?: any
) => {
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 40,
          displayValue: true,
          margin: 10,
          ...options,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [ref, value, options]);
};

interface BarcodeProps {
  value: string;
  options?: any;
  className?: string;
  showValueText?: boolean;
  textClassName?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, options, className, showValueText = true, textClassName }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    useBarcode(barcodeRef, value, { 
        width: 1.5, 
        height: 40, 
        displayValue: false, // Always false in JsBarcode, we render it ourselves
        ...options 
    });
    
    // Fix: Replaced JSX with React.createElement to be compatible with .ts file extension.
    return React.createElement(
        'div',
        { className: className || "text-center max-w-[200px] mx-auto" },
        React.createElement('svg', { key: value, ref: barcodeRef, className: "w-full" }),
        showValueText && React.createElement(
            'p',
            { className: textClassName || "text-xs opacity-70 mt-1" },
            value
        )
    );
};
