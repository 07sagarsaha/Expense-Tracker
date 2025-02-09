import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Expense {
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface MonthlyTotal {
  month: string;
  total: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyTotal[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<{ category: string; total: number }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenseData() {
      if (!user) return;

      try {
        const sixMonthsAgo = subMonths(new Date(), 6);
        const q = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        const expensesData = querySnapshot.docs
          .map(doc => doc.data() as Expense)
          .filter(expense => new Date(expense.date) >= sixMonthsAgo);

        setExpenses(expensesData);

        // Calculate monthly totals
        const monthlyTotals = new Map<string, number>();
        const categoryTotals = new Map<string, number>();

        expensesData.forEach(expense => {
          // Monthly data
          const month = format(new Date(expense.date), 'MMM yyyy');
          monthlyTotals.set(
            month,
            (monthlyTotals.get(month) || 0) + expense.amount
          );

          // Category totals
          categoryTotals.set(
            expense.category,
            (categoryTotals.get(expense.category) || 0) + expense.amount
          );
        });

        setMonthlyData(
          Array.from(monthlyTotals.entries())
            .map(([month, total]) => ({
              month,
              total
            }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        );

        setCategoryTotals(
          Array.from(categoryTotals.entries())
            .map(([category, total]) => ({
              category,
              total
            }))
            .sort((a, b) => b.total - a.total)
        );

        setLoading(false);
      } catch (error) {
        console.error('Error fetching expense data:', error);
        setLoading(false);
      }
    }

    fetchExpenseData();
  }, [user]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Expense Report', 14, 22);
    
    // Add monthly summary
    doc.setFontSize(16);
    doc.text('Monthly Summary', 14, 35);
    
    const monthlyTableData = monthlyData.map(item => [
      item.month,
      `$${item.total.toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Month', 'Total']],
      body: monthlyTableData,
    });
    
    // Add category breakdown
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Category Breakdown', 14, currentY);
    
    const categoryTableData = categoryTotals.map(item => [
      item.category,
      `$${item.total.toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: currentY + 5,
      head: [['Category', 'Total']],
      body: categoryTableData,
    });
    
    // Save the PDF
    doc.save('expense-report.pdf');
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount'],
      ...expenses.map(expense => [
        new Date(expense.date).toLocaleDateString(),
        expense.description,
        expense.category,
        expense.amount.toFixed(2)
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'expenses.csv';
    link.click();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Expense Reports
        </h1>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {monthlyData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No expense data available for the last 6 months</p>
        </div>
      ) : (
        <>
          {/* Monthly Trend Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Monthly Expense Trend
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Expense by Category
            </h2>
            <div className="space-y-4">
              {categoryTotals.map(({ category, total }) => (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {category}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${(total / categoryTotals[0].total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}