"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, Filter, Plus, Edit, Settings, TreePine } from "lucide-react"
import { ChartOfAccounts, AccountFilters } from "@/types/finance"

export function ChartOfAccountsManager() {
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AccountFilters>({
    page: 1,
    limit: 50
  })
  
  // New account form state
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({
    accountCode: "",
    accountName: "",
    accountType: "",
    accountSubType: "",
    description: "",
    parentAccountId: "",
    taxLineMapping: ""
  })

  useEffect(() => {
    fetchAccounts()
  }, [filters])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/chart-of-accounts?${queryParams}`)
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching chart of accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async () => {
    if (!newAccount.accountCode || !newAccount.accountName || !newAccount.accountType) {
      return
    }

    try {
      const response = await fetch('/api/finance/chart-of-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
      })

      if (response.ok) {
        setIsAddingAccount(false)
        setNewAccount({
          accountCode: "",
          accountName: "",
          accountType: "",
          accountSubType: "",
          description: "",
          parentAccountId: "",
          taxLineMapping: ""
        })
        fetchAccounts() // Refresh the list
      }
    } catch (error) {
      console.error('Error creating account:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getAccountTypeBadge = (type: string) => {
    const typeStyles = {
      ASSET: "bg-blue-100 text-blue-800",
      LIABILITY: "bg-red-100 text-red-800",
      EQUITY: "bg-purple-100 text-purple-800",
      REVENUE: "bg-amber-100 text-amber-800",
      EXPENSE: "bg-orange-100 text-orange-800"
    }
    return typeStyles[type as keyof typeof typeStyles] || "bg-gray-100 text-gray-800"
  }

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.accountType]) {
      acc[account.accountType] = []
    }
    acc[account.accountType].push(account)
    return acc
  }, {} as Record<string, ChartOfAccounts[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chart of Accounts</h2>
          <p className="text-muted-foreground">
            Manage your organization's financial account structure
          </p>
        </div>
        <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new account in your chart of accounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account-code">Account Code *</Label>
                  <Input
                    id="account-code"
                    placeholder="1001"
                    value={newAccount.accountCode}
                    onChange={(e) => setNewAccount({ ...newAccount, accountCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-type">Account Type *</Label>
                  <Select
                    value={newAccount.accountType}
                    onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="REVENUE">Revenue</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name *</Label>
                <Input
                  id="account-name"
                  placeholder="Cash - Operating"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-subtype">Account Sub-Type</Label>
                <Input
                  id="account-subtype"
                  placeholder="Current Assets"
                  value={newAccount.accountSubType}
                  onChange={(e) => setNewAccount({ ...newAccount, accountSubType: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description of this account"
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax-mapping">Tax Line Mapping</Label>
                <Input
                  id="tax-mapping"
                  placeholder="Cash"
                  value={newAccount.taxLineMapping}
                  onChange={(e) => setNewAccount({ ...newAccount, taxLineMapping: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddAccount}
                disabled={!newAccount.accountCode || !newAccount.accountName || !newAccount.accountType}
              >
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Account code or name..."
                  className="pl-10"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account-type-filter">Account Type</Label>
              <Select
                value={filters.accountType || "all"}
                onValueChange={(value) => setFilters({ ...filters, accountType: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="ASSET">Assets</SelectItem>
                  <SelectItem value="LIABILITY">Liabilities</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"}
                onValueChange={(value) => setFilters({ 
                  ...filters, 
                  isActive: value === "all" ? undefined : value === "active", 
                  page: 1 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts by Type */}
      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([accountType, typeAccounts]) => (
          <Card key={accountType}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                {accountType} ({typeAccounts.length})
                <Badge className={getAccountTypeBadge(accountType)}>
                  {accountType}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Sub-Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono font-medium">
                            {account.accountCode}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{account.accountName}</p>
                              {account.description && (
                                <p className="text-sm text-muted-foreground">{account.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{account.accountSubType}</TableCell>
                          <TableCell className={`font-medium ${
                            account.balance >= 0 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(account.balance))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.isActive ? "default" : "secondary"}>
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}