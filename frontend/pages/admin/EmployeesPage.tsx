import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle,
  XCircle,
  Award,
  Building,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('employees');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employeesData, isLoading: employeesLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.getEmployees(),
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: (attendanceData: {
      userId: number;
      date: string;
      checkInTime: string;
      checkOutTime: string;
      status: string;
    }) => apiClient.markAttendance(attendanceData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive',
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getDepartmentColor = (department: string) => {
    switch (department?.toLowerCase()) {
      case 'design':
        return 'bg-purple-500/20 text-purple-300';
      case 'project management':
        return 'bg-blue-500/20 text-blue-300';
      case 'sales':
        return 'bg-green-500/20 text-green-300';
      case 'finance':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'hr':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const handleQuickAttendance = async (employee: any, status: 'present' | 'absent') => {
    const currentTime = new Date();
    const checkInTime = status === 'present' ? 
      new Date(currentTime.setHours(9, 0, 0, 0)).toISOString() :
      '';
    const checkOutTime = status === 'present' ? 
      new Date(currentTime.setHours(18, 0, 0, 0)).toISOString() :
      '';

    await markAttendanceMutation.mutateAsync({
      userId: employee.id,
      date: selectedDate,
      checkInTime,
      checkOutTime,
      status,
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading employees: {(error as any).message}</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const employees = employeesData?.employees || [];
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(search.toLowerCase());
    
    const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            Employee Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage employees, attendance, and HR operations
          </p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Employees</p>
                <p className="text-2xl font-bold text-white">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Departments</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(employees.map(e => e.department)).size}
                </p>
              </div>
              <Building className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Payroll</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(employees.reduce((sum, e) => sum + (e.gross_salary || 0), 0))}
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">Monthly</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg CTC</p>
                <p className="text-2xl font-bold text-white">
                  {employees.length > 0 
                    ? formatCurrency(employees.reduce((sum, e) => sum + (e.ctc || 0), 0) / employees.length)
                    : formatCurrency(0)
                  }
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">Annual</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="employees" className="text-gray-300 data-[state=active]:text-white">
            Employee Directory
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-gray-300 data-[state=active]:text-white">
            Attendance Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          {/* Employee Filters */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Search Employees
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, email, or employee ID..."
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="min-w-[150px]">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                  >
                    <option value="">All Departments</option>
                    {Array.from(new Set(employees.map(e => e.department))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Table */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Employee Directory ({filteredEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="rounded-full bg-gray-700 h-10 w-10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-1/4" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No employees found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Employee</TableHead>
                      <TableHead className="text-gray-300">Department</TableHead>
                      <TableHead className="text-gray-300">Designation</TableHead>
                      <TableHead className="text-gray-300">Contact</TableHead>
                      <TableHead className="text-gray-300">Salary</TableHead>
                      <TableHead className="text-gray-300">Joining Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="border-gray-700 hover:bg-gray-800/50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                              {employee.first_name?.[0]?.toUpperCase()}{employee.last_name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {employee.first_name} {employee.last_name}
                              </p>
                              <p className="text-gray-400 text-sm">{employee.employee_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDepartmentColor(employee.department)}>
                            {employee.department}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{employee.designation}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <Phone className="h-3 w-3" />
                              <span>{employee.phone}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <MapPin className="h-3 w-3" />
                              <span>{employee.city}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-white font-medium">{formatCurrency(employee.gross_salary)}</p>
                            <p className="text-gray-400 text-xs">CTC: {formatCurrency(employee.ctc)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatDate(employee.joining_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          {/* Attendance Header */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Daily Attendance</h3>
                  <p className="text-gray-400 text-sm">Mark attendance for employees</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Table */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance for {new Date(selectedDate).toLocaleDateString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Employee</TableHead>
                    <TableHead className="text-gray-300">Department</TableHead>
                    <TableHead className="text-gray-300">Check In</TableHead>
                    <TableHead className="text-gray-300">Check Out</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Quick Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {employee.first_name?.[0]?.toUpperCase()}{employee.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {employee.first_name} {employee.last_name}
                            </p>
                            <p className="text-gray-400 text-sm">{employee.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDepartmentColor(employee.department)}>
                          {employee.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">--:--</TableCell>
                      <TableCell className="text-gray-300">--:--</TableCell>
                      <TableCell>
                        <Badge className="bg-gray-500/20 text-gray-300">
                          Not Marked
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleQuickAttendance(employee, 'present')}
                            disabled={markAttendanceMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleQuickAttendance(employee, 'absent')}
                            disabled={markAttendanceMutation.isPending}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Absent
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}