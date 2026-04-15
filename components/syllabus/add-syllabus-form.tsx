"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useClasses } from "@/hooks/use-classes"
import { useCourses } from "@/hooks/use-courses"
import { useCreateSyllabus } from "@/hooks/use-syllabus"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]

const addSyllabusSchema = z.object({
  name: z.string().min(1, "Syllabus name is required"),
  faculty: z.string().min(1, "Faculty is required"),
  classId: z.string().min(1, "Please select a class"),
  courseId: z.string().min(1, "Please select a course"),
})

type AddSyllabusFormData = z.infer<typeof addSyllabusSchema>

export function AddSyllabusForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { toast } = useToast()
  const { data: classesData, isLoading: isLoadingClasses } = useClasses()
  const { data: coursesData, isLoading: isLoadingCourses } = useCourses()
  const createSyllabus = useCreateSyllabus()

  // Debug: Log classes data when it changes
  useEffect(() => {
    console.log("Classes data updated:", classesData)
  }, [classesData])

  const form = useForm<AddSyllabusFormData>({
    resolver: zodResolver(addSyllabusSchema),
    defaultValues: {
      name: "",
      faculty: "",
      classId: "",
      courseId: "",
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, Word documents, and text files are allowed.",
        variant: "destructive",
      })
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    form.setValue("classId", classId)
    
    // Reset course selection and clear validation error
    form.setValue("courseId", "")
    form.clearErrors("courseId")
  }

  const availableCourses = selectedClass ? (coursesData || []) : []

  const onSubmit = async (data: AddSyllabusFormData) => {
    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    try {
      await createSyllabus.mutateAsync({
        name: data.name,
        faculty: data.faculty,
        classId: data.classId,
        courseId: data.courseId,
        file: selectedFile,
      })

      toast({
        title: "Success",
        description: "Syllabus uploaded successfully!",
      })

      // Reset form
      form.reset()
      setSelectedFile(null)
      setSelectedClass("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload syllabus",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄"
    if (fileType.includes("word") || fileType.includes("document")) return "📝"
    return "📄"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Add New Syllabus</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Syllabus Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Syllabus Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter syllabus name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Faculty */}
            <FormField
              control={form.control}
              name="faculty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter faculty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Class Selection */}
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Class</FormLabel>
                  <Select
                    onValueChange={handleClassChange}
                    value={field.value}
                    disabled={isLoadingClasses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classesData?.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-2 bg-gray-100 rounded text-xs">
                <p>Selected Class: {selectedClass || 'None'}</p>
                <p>Available Courses: {availableCourses.length}</p>
                <p>Classes Data: {classesData ? 'Loaded' : 'Loading...'}</p>
              </div>
            )}

            {/* Course Selection */}
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedClass || isLoadingCourses || availableCourses.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            !selectedClass 
                              ? "First select a class" 
                              : isLoadingCourses
                                ? "Loading courses..."
                              : availableCourses.length === 0 
                                ? "No courses available"
                                : "Choose a course"
                          } 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCourses.length > 0 ? (
                        availableCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1 text-sm text-gray-500">
                          {!selectedClass ? "Select a class first" : "No courses available for this class"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Syllabus File</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="syllabus-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, Word, or Text files (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="syllabus-file"
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(selectedFile.type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={createSyllabus.isPending || !selectedFile}
            >
              {createSyllabus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Syllabus
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}