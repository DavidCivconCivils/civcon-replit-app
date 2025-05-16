import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Download, FileDown, BarChart, PieChart, TrendingUp, DollarSign } from "lucide-react";

// Import recharts components for visualizations
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function Reports() {
  const [reportType, setReportType] = useState("requisition-summary");
  const [dateRange, setDateRange] = useState("this-month");
  const [reportFormat, setReportFormat] = useState("pdf");
  
  // Fetch data for reports
  const { data: projectExpenditures, isLoading: isLoadingProjectData } = useQuery({
    queryKey: ['/api/reports/project-expenditures'],
  });
  
  const { data: requisitionStatus, isLoading: isLoadingRequisitionData } = useQuery({
    queryKey: ['/api/reports/requisition-status'],
  });
  
  const { data: topSuppliers, isLoading: isLoadingSupplierData } = useQuery({
    queryKey: ['/api/reports/top-suppliers'],
  });
  
  const { data: monthlyTrend, isLoading: isLoadingTrendData } = useQuery({
    queryKey: ['/api/reports/monthly-trend'],
  });
  
  const { data: userExpenditures, isLoading: isLoadingUserData } = useQuery({
    queryKey: ['/api/reports/user-expenditures'],
  });
  
  // Colors for charts
  const COLORS = ['#1a5276', '#2980b9', '#3498db', '#5dade2', '#85c1e9'];
  const STATUS_COLORS = {
    pending: '#f39c12',
    approved: '#2ecc71',
    rejected: '#dc3545'
  };
  
  // Format the requisition status data for pie chart
  const formatRequisitionStatusData = () => {
    if (!requisitionStatus) return [];
    
    return requisitionStatus.map((item: any) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.count,
      color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#6c757d'
    }));
  };
  
  const handleGenerateReport = () => {
    alert(`Generating ${reportType} report for ${dateRange} in ${reportFormat} format.`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-text">Reports</h1>
        <Button className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>
      
      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-neutral-text mb-4">Generate Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requisition-summary">Requisition Summary</SelectItem>
                <SelectItem value="po-summary">Purchase Order Summary</SelectItem>
                <SelectItem value="project-expenditure">Project Expenditure</SelectItem>
                <SelectItem value="supplier-analysis">Supplier Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date-range">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-format">Format</Label>
            <Select value={reportFormat} onValueChange={setReportFormat}>
              <SelectTrigger id="report-format">
                <SelectValue placeholder="Select Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerateReport}>
            Generate Report
          </Button>
        </div>
      </div>
      
      {/* Sample Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Expenditures Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Expenditure by User
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingUserData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : userExpenditures && userExpenditures.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={userExpenditures}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="userName" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(parseFloat(value as string))} />
                      <Bar dataKey="totalAmount" fill="#2980b9" name="Total Spent" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {userExpenditures.map((user: any, index: number) => (
                    <div key={user.userId} className="flex justify-between">
                      <span className="text-sm text-neutral-textLight">
                        {user.userName} ({user.requisitionCount} requisitions):
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(parseFloat(user.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-neutral-textLight">No user expenditure data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Project Expenditure Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Project Expenditure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProjectData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : projectExpenditures && projectExpenditures.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={projectExpenditures}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="projectName" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(parseFloat(value as string))} />
                      <Bar dataKey="totalAmount" fill="#1a5276" name="Total Spent" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {projectExpenditures.map((project: any, index: number) => (
                    <div key={project.projectId} className="flex justify-between">
                      <span className="text-sm text-neutral-textLight">{project.projectName}:</span>
                      <span className="text-sm font-medium">{formatCurrency(parseFloat(project.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-neutral-textLight">No project expenditure data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Requisition Status Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Requisition Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRequisitionData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : requisitionStatus && requisitionStatus.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={formatRequisitionStatusData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {formatRequisitionStatusData().map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} requisitions`} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {formatRequisitionStatusData().map((status: any, index: number) => (
                    <div key={index} className="flex items-center">
                      <span className={`h-3 w-3 rounded-full mr-2`} style={{ backgroundColor: status.color }}></span>
                      <span className="text-sm text-neutral-textLight">{status.name}:</span>
                      <span className="text-sm font-medium ml-auto">{((status.value / formatRequisitionStatusData().reduce((acc: number, curr: any) => acc + curr.value, 0)) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-neutral-textLight">No requisition status data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Top Suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Top Suppliers by Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSupplierData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : topSuppliers && topSuppliers.length > 0 ? (
              <ul className="divide-y divide-neutral-secondary">
                {topSuppliers.map((supplier: any) => (
                  <li key={supplier.supplierId} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-neutral-text">{supplier.supplierName}</p>
                      <p className="text-xs text-neutral-textLight">{supplier.orderCount} Purchase Orders</p>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(parseFloat(supplier.totalAmount))}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-neutral-textLight">No supplier data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Monthly Purchase Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrendData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : monthlyTrend && monthlyTrend.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyTrend}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === "totalAmount") return formatCurrency(parseFloat(value as string));
                        return value;
                      }} />
                      <Legend />
                      <Line type="monotone" dataKey="totalAmount" name="Purchase Value" stroke="#1a5276" strokeWidth={2} />
                      <Line type="monotone" dataKey="orderCount" name="Orders Count" stroke="#f39c12" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {monthlyTrend.length > 0 && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-neutral-textLight">This Month</p>
                        <p className="text-lg font-medium text-neutral-text">
                          {formatCurrency(parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount))}
                        </p>
                        {monthlyTrend.length > 1 && (
                          <p className={`text-xs ${parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) > parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) ? 'text-status-success' : 'text-status-error'}`}>
                            {parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) > parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) ? '+' : ''}
                            {((parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) - parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount)) / parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) * 100).toFixed(0)}% vs last month
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-neutral-textLight">Avg. Order Value</p>
                        <p className="text-lg font-medium text-neutral-text">
                          {formatCurrency(parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) / monthlyTrend[monthlyTrend.length - 1].orderCount)}
                        </p>
                        {monthlyTrend.length > 1 && (
                          <p className={`text-xs ${(parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) / monthlyTrend[monthlyTrend.length - 1].orderCount) > (parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) / monthlyTrend[monthlyTrend.length - 2].orderCount) ? 'text-status-success' : 'text-status-error'}`}>
                            {(parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) / monthlyTrend[monthlyTrend.length - 1].orderCount) > (parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) / monthlyTrend[monthlyTrend.length - 2].orderCount) ? '+' : ''}
                            {(((parseFloat(monthlyTrend[monthlyTrend.length - 1].totalAmount) / monthlyTrend[monthlyTrend.length - 1].orderCount) - (parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) / monthlyTrend[monthlyTrend.length - 2].orderCount)) / (parseFloat(monthlyTrend[monthlyTrend.length - 2].totalAmount) / monthlyTrend[monthlyTrend.length - 2].orderCount) * 100).toFixed(0)}% vs last month
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-neutral-textLight">Orders Count</p>
                        <p className="text-lg font-medium text-neutral-text">{monthlyTrend[monthlyTrend.length - 1].orderCount}</p>
                        {monthlyTrend.length > 1 && (
                          <p className={`text-xs ${monthlyTrend[monthlyTrend.length - 1].orderCount > monthlyTrend[monthlyTrend.length - 2].orderCount ? 'text-status-success' : 'text-status-error'}`}>
                            {monthlyTrend[monthlyTrend.length - 1].orderCount > monthlyTrend[monthlyTrend.length - 2].orderCount ? '+' : ''}
                            {monthlyTrend[monthlyTrend.length - 1].orderCount - monthlyTrend[monthlyTrend.length - 2].orderCount} vs last month
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-neutral-textLight">No monthly trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
