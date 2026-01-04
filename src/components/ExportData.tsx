"use client"

import { useState } from "react"
import { Download, FileText, Table2, Calendar } from "lucide-react"
import { supabase } from "../lib/supabase"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import type { Database } from '../lib/database.types'

type ExportFormat = "csv" | "json"
type DataType = "visits" | "visitors" | "users"

type ExportRow =
  | Database['public']['Tables']['visits']['Row']
  | Database['public']['Tables']['visitors']['Row']
  | Database['public']['Tables']['hosts']['Row'];

export function ExportData() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [dataType, setDataType] = useState<DataType>("visits");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = (data: ExportRow[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export")
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => JSON.stringify((row as Record<string, unknown>)[header] || "")).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
  }

  const exportToJSON = (data: ExportRow[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export")
      return
    }

    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.json`
    link.click()
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let query = supabase.from(dataType).select("*")

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString())
      }
      if (endDate) {
        query = query.lte("created_at", new Date(endDate).toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error("No data found for the selected criteria")
        return
      }

      if (exportFormat === "csv") {
        exportToCSV(data, dataType)
      } else {
        exportToJSON(data, dataType)
      }

      toast.success(`Successfully exported ${data.length} records`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <Download className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Export your visitor management data in various formats
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow-xl sm:rounded-2xl overflow-hidden">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="dataType" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Data Type
                </label>
                <div className="relative">
                  <select
                    id="dataType"
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value as DataType)}
                    className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                  >
                    <option value="visits">Visits</option>
                    <option value="visitors">Visitors</option>
                    <option value="users">Users</option>
                  </select>
                  <Table2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" strokeWidth={2} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="exportFormat"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                >
                  Export Format
                </label>
                <div className="relative">
                  <select
                    id="exportFormat"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                  <FileText
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Start Date (Optional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                  />
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  End Date (Optional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                  />
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Download className="h-5 w-5" strokeWidth={2.5} />
                {isExporting ? "Exporting..." : "Export Data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
