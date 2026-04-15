"use client"

import { useState } from "react"
import { 
  Search, 
  Eye, 
  Edit,
  Trash2,
  Filter,
  Printer,
  CreditCard,
  Calendar,
  User,
  GraduationCap,
  Users,
  QrCode
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useIDCards, useIDCardFilters, useDeleteIDCard } from "@/hooks/use-id-cards"
import { IDCardPreview } from "./id-card-preview"
import { PrintDialog } from "./print-dialog"
import type { IDCard } from "@/types/id-cards"

export function IDCardsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<IDCard | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  
  const { toast } = useToast()
  const { filters, updateFilters, clearFilters } = useIDCardFilters()
  const { data: cardsData, isLoading } = useIDCards({
    ...filters,
    search: searchTerm,
  })
  const deleteIDCard = useDeleteIDCard()

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleTypeFilter = (type: string) => {
    updateFilters({ type: type as any })
  }

  const handleStatusFilter = (status: string) => {
    updateFilters({ status: status as any })
  }

  const handleViewCard = (card: IDCard) => {
    setSelectedCard(card)
    setIsPreviewOpen(true)
  }

  const handlePrintSingle = (card: IDCard) => {
    setSelectedCards([card.id])
    setIsPrintDialogOpen(true)
  }

  const handlePrintSelected = () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No cards selected",
        description: "Please select cards to print",
        variant: "destructive",
      })
      return
    }
    setIsPrintDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteIDCard.mutateAsync(id)
      toast({
        title: "Success",
        description: "ID card deleted successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ID card",
        variant: "destructive",
      })
    }
  }

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedCards.length === cardsData?.cards.length) {
      setSelectedCards([])
    } else {
      setSelectedCards(cardsData?.cards.map(card => card.id) || [])
    }
  }

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) < new Date()
    const actualStatus = isExpired ? 'expired' : status

    switch (actualStatus) {
      case 'active':
        return <Badge className="text-white" style={{backgroundColor: '#007815'}}>Active</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'student' ? (
      <GraduationCap className="h-4 w-4 text-blue-600" />
    ) : (
      <Users className="h-4 w-4 text-purple-600" />
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading ID cards...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>ID Cards List</span>
            {cardsData && (
              <Badge variant="secondary" className="ml-2">
                {cardsData.total} total
              </Badge>
            )}
          </div>
          
          {selectedCards.length > 0 && (
            <Button onClick={handlePrintSelected} className="ml-auto">
              <Printer className="mr-2 h-4 w-4" />
              Print Selected ({selectedCards.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col space-y-4 mb-6 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={filters.type || "all"}
            onValueChange={handleTypeFilter}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full md:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCards.length === cardsData?.cards.length && cardsData?.cards.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Card Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cardsData?.cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-gray-500">
                      <CreditCard className="h-8 w-8" />
                      <p>No ID cards found</p>
                      <p className="text-sm">Create your first ID card to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cardsData?.cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCards.includes(card.id)}
                        onCheckedChange={() => toggleCardSelection(card.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{card.cardNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium">{card.personName}</div>
                          <div className="text-sm text-gray-500">
                            {card.type === 'student' ? card.program : card.position}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(card.type)}
                        <span className="capitalize">{card.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{card.department}</TableCell>
                    <TableCell>
                      {getStatusBadge(card.status, card.expiryDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(card.issueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(card.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* View/Preview Card */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCard(card)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Preview Card"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Print Single Card */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintSingle(card)}
                          style={{color: '#007815'}} className="hover:opacity-70"
                          title="Print Card"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        
                        {/* Delete Card */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              title="Delete Card"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete ID Card</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the ID card for {card.personName}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(card.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {cardsData && cardsData.total > cardsData.limit && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {cardsData.cards.length} of {cardsData.total} cards
          </div>
        )}

        {/* Card Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ID Card Preview</DialogTitle>
              <DialogDescription>
                {selectedCard && `${selectedCard.personName} - ${selectedCard.cardNumber}`}
              </DialogDescription>
            </DialogHeader>
            {selectedCard && <IDCardPreview card={selectedCard} />}
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <PrintDialog
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          selectedCardIds={selectedCards}
          onPrintComplete={() => {
            setSelectedCards([])
            setIsPrintDialogOpen(false)
          }}
        />
      </CardContent>
    </Card>
  )
}