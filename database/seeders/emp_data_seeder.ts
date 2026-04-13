import { BaseSeeder } from '@adonisjs/lucid/seeders'
import EmpData from '#models/emp_data'

const firstNames = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Ashwin', 'Bhavya', 'Chandra',
  'Deepa', 'Devika', 'Dhruv', 'Divya', 'Gaurav', 'Gayatri', 'Harsh', 'Isha',
  'Jayesh', 'Jyoti', 'Karan', 'Kavita', 'Kunal', 'Lakshmi', 'Manoj', 'Meera',
  'Mohit', 'Nandini', 'Naveen', 'Neha', 'Nikhil', 'Nisha', 'Omkar', 'Pallavi',
  'Pankaj', 'Pooja', 'Pradeep', 'Priya', 'Rahul', 'Rajesh', 'Rakesh', 'Ravi',
  'Rekha', 'Rohit', 'Sachin', 'Sandeep', 'Sanjay', 'Sapna', 'Sarita', 'Shilpa',
  'Shreya', 'Siddharth', 'Sneha', 'Sunil', 'Sunita', 'Suresh', 'Swati', 'Tanvi',
  'Varun', 'Vidya', 'Vijay', 'Vinod',
]

const lastNames = [
  'Agarwal', 'Banerjee', 'Bhat', 'Chakraborty', 'Choudhury', 'Das', 'Desai',
  'Deshpande', 'Ghosh', 'Gupta', 'Iyer', 'Jain', 'Joshi', 'Kapoor', 'Khan',
  'Kulkarni', 'Kumar', 'Malhotra', 'Mehta', 'Menon', 'Mishra', 'Mukherjee',
  'Nair', 'Patel', 'Pillai', 'Rao', 'Reddy', 'Roy', 'Saxena', 'Sharma',
  'Shetty', 'Singh', 'Sinha', 'Srivastava', 'Thakur', 'Tiwari', 'Varma',
  'Venkatesh', 'Verma', 'Yadav',
]

export default class extends BaseSeeder {
  async run() {
    const records = []

    for (let i = 1; i <= 100; i++) {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)]
      const last = lastNames[Math.floor(Math.random() * lastNames.length)]
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`

      records.push({
        email,
        firstName: first,
        lastName: last,
        empId: 1000 + i,
      })
    }

    await EmpData.createMany(records)
    console.log(`✅ Seeded 100 employee records into emp_data`)
  }
}
