'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import type { IDCard } from "@/types/id-cards"

interface IDCardPreviewProps {
  card: IDCard
  showPrintButton?: boolean
}

const cardDimensions = {
  className: "w-80 h-48",
  width: 320,
  height: 192
}

export function IDCardPreview({ card, showPrintButton = true }: IDCardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  const isExpired = new Date(card.expiryDate) < new Date()
  
  const qrData = JSON.stringify({
    cardNumber: card.cardNumber,
    studentId: card.personId,
    name: card.personName,
    expiryDate: card.expiryDate
  })

  const handlePrint = () => {
    if (cardRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ID Card</title>
              <style>
                @page { size: 3.375in 2.125in; margin: 0; }
                body { margin: 0; padding: 0; }
                .card { width: 3.375in; height: 2.125in; }
              </style>
            </head>
            <body>
              ${cardRef.current.outerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Card Front - Minimalistic Design */}
      <div className="flex justify-center">
        <div 
          ref={cardRef}
          className={`${cardDimensions.className} relative bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200`}
          style={{ 
            fontFamily: "'Courier New', 'IBM Plex Mono', monospace",
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Yellow strip at top */}
          <div className="h-4 bg-yellow-400"></div>
          
          {/* Main content area */}
          <div className="flex h-full p-4">
            {/* Left side - Photo */}
            <div className="w-20 h-20 mr-4 flex-shrink-0">
              <img
                src={card.photo || "/placeholder-user.jpg"}
                alt={card.personName}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
            </div>
            
            {/* Right side - Details */}
            <div className="flex-1 flex flex-col justify-between text-xs">
              {/* University header */}
              <div className="text-center mb-2">
                <div className="font-bold text-gray-800 text-sm">AMOUD UNIVERSITY</div>
                <div className="text-gray-600 text-xs">STUDENT ID CARD</div>
              </div>
              
              {/* Student details */}
              <div className="space-y-1">
                <div>
                  <span className="font-bold text-gray-700">NAME:</span>
                  <div className="font-bold text-gray-900">{card.personName.toUpperCase()}</div>
                </div>
                <div>
                  <span className="font-bold text-gray-700">ID:</span>
                  <span className="font-bold text-gray-900 ml-1">{card.personId}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">FACULTY:</span>
                  <div className="text-gray-900 text-xs">{card.program?.toUpperCase() || card.position?.toUpperCase() || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-bold text-gray-700">DEPT:</span>
                  <div className="text-gray-900 text-xs">{card.department?.toUpperCase() || 'N/A'}</div>
                </div>
              </div>
              
              {/* Bottom info */}
              <div className="text-right">
                <div className="text-gray-600 text-xs">{new Date().getFullYear()}</div>
                <div className="text-gray-600 text-xs">{card.academicYear || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Back Preview */}
      <div className="flex justify-center">
        <div className={`${cardDimensions.className} relative bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200`}
          style={{ 
            fontFamily: "'Courier New', 'IBM Plex Mono', monospace",
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex h-full">
            {/* Left side - White section */}
            <div className="w-3/5 bg-white p-4 flex flex-col justify-between">
              {/* University logo and name */}
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full p-1">
                  <img
                    src="/amoud-logo.png"
                    alt="Amoud University"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="font-bold text-gray-800 text-xs">AMOUD UNIVERSITY</div>
                <div className="text-gray-600 text-xs">BORAMA, SOMALILAND</div>
              </div>
              
              {/* QR Code */}
              <div className="text-center">
                <div className="inline-block bg-white p-2 rounded border border-gray-200">
                  <QRCodeSVG
                    value={qrData}
                    size={60}
                    bgColor="white"
                    fgColor="black"
                    level="M"
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">SCAN TO VERIFY</div>
              </div>
              
              {/* Card info */}
              <div className="text-xs text-gray-600">
                <div>CARD NO: {card.cardNumber}</div>
                <div>ISSUED: {new Date(card.issueDate).toLocaleDateString()}</div>
                <div>EXPIRES: {new Date(card.expiryDate).toLocaleDateString()}</div>
              </div>
            </div>
            
            {/* Right side - Amber section */}
            <div className="w-2/5 bg-yellow-400 p-3 flex flex-col justify-between">
              <div className="text-center">
                <div className="font-bold text-gray-900 text-xs mb-2">TERMS OF USE</div>
                <div className="text-xs text-gray-800 space-y-1 leading-relaxed">
                  <div>• This card is property of Amoud University</div>
                  <div>• Must be worn visibly on campus</div>
                  <div>• Report if lost or stolen</div>
                  <div>• Non-transferable</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-bold text-gray-900 text-xs mb-1">EMERGENCY CONTACT</div>
                <div className="text-xs text-gray-800">
                  <div>+252 634 123 456</div>
                  <div>security@amoud.edu.so</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-gray-900 text-xs font-bold">
                  {isExpired ? 'EXPIRED' : 'VALID'}
                </div>
                <div className="text-gray-900 text-xs">
                  {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Information Summary */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-700">Card Details</div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Card Number:</span>
                <span className="font-medium">{card.cardNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{card.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  isExpired ? 'text-red-600' : 
                  card.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {isExpired ? 'Expired' : card.status}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Validity</div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Issue Date:</span>
                <span className="font-medium">
                  {new Date(card.issueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiry Date:</span>
                <span className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                  {new Date(card.expiryDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Until Expiry:</span>
                <span className={`font-medium ${
                  Math.ceil((new Date(card.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 30 ? 'text-orange-600' : ''
                }`}>
                  {Math.max(0, Math.ceil((new Date(card.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Print Button */}
      {showPrintButton && (
        <div className="flex justify-center">
          <Button onClick={handlePrint} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900">
            Print ID Card
          </Button>
        </div>
      )}
    </div>
  )
}