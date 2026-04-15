"use client"

import { useState, useRef } from "react"
import QRCode from "qrcode"
import { Printer, Download, Settings, CheckCircle2, Users, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useIDCards } from "@/hooks/use-id-cards"
import { IDCardPreview } from "./id-card-preview"

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCardIds: string[]
  onPrintComplete?: () => void
}

export function PrintDialog({ 
  open, 
  onOpenChange, 
  selectedCardIds, 
  onPrintComplete 
}: PrintDialogProps) {
  const [printOptions, setPrintOptions] = useState({
    format: 'single', // single, batch, class
    orientation: 'portrait',
    paperSize: 'A4',
    cardsPerPage: 8,
    includeBothSides: true,
    department: '',
    cardType: 'all',
  })
  const [isPrinting, setIsPrinting] = useState(false)
  const printPreviewRef = useRef<HTMLDivElement>(null)
  
  const { toast } = useToast()
  const { data: cardsData } = useIDCards({})

  // Get selected cards data
  const selectedCards = cardsData?.cards.filter(card => 
    selectedCardIds.includes(card.id)
  ) || []

  const handlePrintOptionChange = (key: string, value: any) => {
    setPrintOptions(prev => ({ ...prev, [key]: value }))
  }

  // Generate QR code data URLs for all cards
  const generateQRCodes = async () => {
    const qrPromises = selectedCards.map(async card => {
      const qrValue = JSON.stringify({
        id: card.id,
        cardNumber: card.cardNumber,
        name: card.personName,
        type: card.type,
        department: card.department,
        issueDate: card.issueDate,
        expiryDate: card.expiryDate,
      })
      return QRCode.toDataURL(qrValue, { width: 60, margin: 0 })
    })
    return Promise.all(qrPromises)
  }

  const generatePrintContent = async () => {
    if (!selectedCards.length) return ''

    const qrDataUrls = await generateQRCodes()

    // Mixed card types require flexible layout
    const hasStudentCards = selectedCards.some(card => card.type === 'student')
    const hasStaffCards = selectedCards.some(card => card.type === 'staff')
    const mixedCardTypes = hasStudentCards && hasStaffCards

    const cardsPerRow = mixedCardTypes ? 1 : // Mixed types use single column
                       printOptions.cardsPerPage === 8 ? 2 : 
                       printOptions.cardsPerPage === 12 ? 3 : 1

    return `
      <html>
        <head>
          <title>ID Cards Print</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
              background: white;
            }
            .print-container {
              width: 100%;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.25in;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(${cardsPerRow}, 1fr);
              gap: 0.25in;
              margin-bottom: 0.5in;
              justify-items: center;
              align-items: center;
            }
            .card-wrapper-student {
              width: 3.375in;
              height: 2.125in;
              border-radius: 0.5rem;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              page-break-inside: avoid;
              margin: 0 auto;
            }
            .card-wrapper-staff {
              width: 2.125in;
              height: 3.375in;
              border-radius: 0.5rem;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              page-break-inside: avoid;
              margin: 0 auto;
            }
            .card-front, .card-back {
              width: 100%;
              height: 100%;
              position: relative;
              background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%);
              border: 2px solid #e9ecef;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .card-header {
              height: 60px;
              background: linear-gradient(135deg, #007815 0%, #006012 50%, #004a0e 100%);
              color: white;
              padding: 8px 12px;
              font-size: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 2px 4px rgba(0, 120, 21, 0.2);
              position: relative;
              overflow: hidden;
            }
            .card-header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
              opacity: 0.1;
            }
            .card-logo {
              width: 20px;
              height: 20px;
              background: white;
              border-radius: 50%;
              padding: 1px;
            }
            .card-content {
              padding: 12px;
              height: calc(100% - 48px);
              display: flex;
              position: relative;
            }
            .card-content-portrait {
              padding: 12px;
              height: calc(100% - 48px);
              display: flex;
              flex-direction: column;
              position: relative;
            }
            .card-photo {
              width: 48px;
              height: 60px;
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              border-radius: 4px;
              margin-right: 12px;
              overflow: hidden;
              flex-shrink: 0;
            }
            .card-photo-portrait {
              width: 60px;
              height: 72px;
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              border-radius: 4px;
              overflow: hidden;
              flex-shrink: 0;
            }
            .card-photo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .card-info {
              flex: 1;
              font-size: 10px;
            }
            .card-bottom-stripe {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 24px;
              background: linear-gradient(90deg, #007815 0%, #006012 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 8px;
              font-size: 8px;
              font-weight: bold;
            }
              line-height: 1.3;
            }
            .card-name {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 4px;
              color: #212529;
            }
            .card-detail {
              color: #6c757d;
              margin-bottom: 2px;
            }
            .card-qr {
              position: absolute;
              top: 12px;
              right: 12px;
              width: 44px;
              height: 44px;
              background: white;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 2px;
            }
            .card-dates {
              position: absolute;
              bottom: 12px;
              right: 12px;
              font-size: 8px;
              color: #6c757d;
              text-align: right;
            }
            .card-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 24px;
              background: linear-gradient(90deg, #007815 0%, #006012 100%);
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 12px;
              font-size: 8px;
              color: white;
            }
            .card-back-content {
              padding: 16px;
              font-size: 9px;
              color: #495057;
            }
            .back-header {
              text-align: center;
              border-bottom: 1px solid #dee2e6;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .back-terms {
              margin-bottom: 12px;
            }
            .back-contact {
              font-size: 8px;
              color: #868e96;
            }
            .back-footer {
              position: absolute;
              bottom: 8px;
              left: 16px;
              right: 16px;
              border-top: 1px solid #dee2e6;
              padding-top: 4px;
              font-size: 7px;
              color: #adb5bd;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .print-container { max-width: none; }
              .card-wrapper { 
                box-shadow: none; 
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="cards-grid">
              ${selectedCards.map((card, idx) => `
                <div class="card-wrapper-${card.type === 'student' ? 'student' : 'staff'}">
                  <div class="card-front">
                    <div class="card-header">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="/api/brand/logo" alt="Logo" class="card-logo" />
                        <div>
                          <div style="font-weight: bold; font-size: 9px;">BAH HABAR GOBE</div>
                          <div style="font-size: 8px; opacity: 0.9;">Management System</div>
                        </div>
                      </div>
                      <div style="text-align: right; font-size: 8px;">
                        <div>OFFICIAL ID</div>
                        <div style="font-weight: bold;">${card.type.toUpperCase()}</div>
                      </div>
                    </div>
                    <div class="${card.type === 'student' ? 'card-content' : 'card-content-portrait'}">
                      ${card.type === 'student' ? `
                        <!-- Student Card - Landscape Layout -->
                        <div class="card-photo">
                          ${card.photoUrl ? `<img src="${card.photoUrl}" alt="${card.personName}" />` : 
                            `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #adb5bd;">🎓</div>`
                          }
                        </div>
                        <div class="card-info">
                          <div class="card-name">${card.personName}</div>
                          <div class="card-detail">ID: ${card.cardNumber}</div>
                          <div class="card-detail">${card.department}</div>
                          ${card.program ? `<div class="card-detail">${card.program}</div>` : ''}
                        </div>
                        <div class="card-qr">
                          <img src="${qrDataUrls[idx]}" alt="QR Code" style="width: 100%; height: 100%;" />
                        </div>
                        <div class="card-dates">
                          <div>Issued: ${new Date(card.issueDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</div>
                          <div>Expires: ${new Date(card.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</div>
                        </div>
                      ` : `
                        <!-- Staff Card - Portrait Layout -->
                        <div style="display: flex; justify-between; margin-bottom: 12px;">
                          <div class="card-photo-portrait">
                            ${card.photoUrl ? `<img src="${card.photoUrl}" alt="${card.personName}" />` : 
                              `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #adb5bd;">👥</div>`
                            }
                          </div>
                          <div style="background: white; border: 1px solid #dee2e6; border-radius: 4px; padding: 2px; width: 50px; height: 50px;">
                            <img src="${qrDataUrls[idx]}" alt="QR Code" style="width: 100%; height: 100%;" />
                          </div>
                        </div>
                        <div style="flex: 1;">
                          <div class="card-name">${card.personName}</div>
                          <div class="card-detail">ID: ${card.cardNumber}</div>
                          <div class="card-detail">${card.department}</div>
                          ${card.position ? `<div class="card-detail">${card.position}</div>` : ''}
                        </div>
                        <div style="display: flex; justify-between; font-size: 8px; color: #6c757d; margin-top: 8px;">
                          <div style="text-align: center;">
                            <div>Issued</div>
                            <div style="font-weight: bold;">${new Date(card.issueDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</div>
                          </div>
                          <div style="text-align: center;">
                            <div>Expires</div>
                            <div style="font-weight: bold;">${new Date(card.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</div>
                          </div>
                        </div>
                      `}
                    </div>
                    <div class="card-footer">
                      <span>${new Date(card.expiryDate) < new Date() ? 'EXPIRED' : 'VALID'}</span>
                      <span>${card.type === 'student' ? 'STUDENT CARD' : 'STAFF CARD'}</span>
                      <span>BHG-MS</span>
                    </div>
                  </div>
                </div>
                ${printOptions.includeBothSides ? `
                <div class="card-wrapper-${card.type === 'student' ? 'student' : 'staff'}">
                  <div class="card-back">
                    <div class="card-back-content">
                      <div class="back-header">
                        <div style="font-weight: bold; color: #d97706;">BAH HABAR GOBE</div>
                        <div>Official Identification Card</div>
                      </div>
                      <div class="back-terms">
                        <div style="font-weight: bold; margin-bottom: 4px;">Terms of Use:</div>
                        <div>• This card is property of Bah Habar Gobe</div>
                        <div>• Must be carried at all times on campus</div>
                        <div>• Report lost/stolen cards immediately</div>
                        <div>• Valid only with photo and signature</div>
                      </div>
                      <div class="back-contact">
                        <div>📍 Borama, Awdal Region, Somaliland</div>
                        <div>📞 +252 63 123 4567</div>
                        <div>✉️ info@amouduniversity.edu.so</div>
                      </div>
                      <div class="back-footer">
                        <span>© 2024 Bah Habar Gobe</span>
                        <span>Authority Signature: ___________</span>
                      </div>
                    </div>
                  </div>
                </div>
                ` : ''}
              `).join('')}
            </div>
          </div>
        </body>
      </html>
    `
  }

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      const printContent = await generatePrintContent()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 1000))
        printWindow.print()
        toast({
          title: "Print Started",
          description: `Printing ${selectedCards.length} ID card(s)`,
        })
        onPrintComplete?.()
      } else {
        throw new Error('Unable to open print window')
      }
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to start printing process",
        variant: "destructive",
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadPDF = async () => {
    // This would integrate with a PDF generation library like jsPDF or Puppeteer
    toast({
      title: "Coming Soon",
      description: "PDF download functionality will be available soon",
    })
  }

  if (!selectedCards.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Cards Selected</DialogTitle>
            <DialogDescription>
              Please select cards to print from the table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Printer className="h-5 w-5" />
            <span>Print ID Cards</span>
          </DialogTitle>
          <DialogDescription>
            Configure print settings for {selectedCards.length} selected card(s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Print Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Print Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paper Size */}
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select
                  value={printOptions.paperSize}
                  onValueChange={(value) => handlePrintOptionChange('paperSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cards Per Page */}
              <div className="space-y-2">
                <Label>Cards Per Page</Label>
                <Select
                  value={printOptions.cardsPerPage.toString()}
                  onValueChange={(value) => handlePrintOptionChange('cardsPerPage', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 card per page</SelectItem>
                    <SelectItem value="4">4 cards per page</SelectItem>
                    <SelectItem value="8">8 cards per page (recommended)</SelectItem>
                    <SelectItem value="12">12 cards per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={printOptions.orientation}
                  onValueChange={(value) => handlePrintOptionChange('orientation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Both Sides */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bothSides"
                  checked={printOptions.includeBothSides}
                  onCheckedChange={(checked) => 
                    handlePrintOptionChange('includeBothSides', checked)
                  }
                />
                <Label htmlFor="bothSides">Include both sides of card</Label>
              </div>
            </CardContent>
          </Card>

          {/* Selected Cards Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Selected Cards ({selectedCards.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedCards.map((card) => (
                  <div key={card.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {card.type === 'student' ? (
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Users className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{card.personName}</div>
                      <div className="text-xs text-gray-500">
                        {card.cardNumber} • {card.department}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {card.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sample Preview */}
        {selectedCards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Print Preview Sample</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="transform scale-75 origin-center">
                  <IDCardPreview card={selectedCards[0]} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0">
          <div className="flex space-x-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none text-white hover:opacity-90"
              style={{backgroundColor: '#007815'}}
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print Cards'}
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}