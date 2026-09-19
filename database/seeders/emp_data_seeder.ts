import { BaseSeeder } from '@adonisjs/lucid/seeders'
import EmpData from '#models/emp_data'
import User from '#models/user'
import { DateTime } from 'luxon'

const firstNames = [
  'Aarav',
  'Aditi',
  'Akash',
  'Ananya',
  'Arjun',
  'Ashwin',
  'Bhavya',
  'Chandra',
  'Deepa',
  'Devika',
  'Dhruv',
  'Divya',
  'Gaurav',
  'Gayatri',
  'Harsh',
  'Isha',
  'Jayesh',
  'Jyoti',
  'Karan',
  'Kavita',
  'Kunal',
  'Lakshmi',
  'Manoj',
  'Meera',
  'Mohit',
  'Nandini',
  'Naveen',
  'Neha',
  'Nikhil',
  'Nisha',
  'Omkar',
  'Pallavi',
  'Pankaj',
  'Pooja',
  'Pradeep',
  'Priya',
  'Rahul',
  'Rajesh',
  'Rakesh',
  'Ravi',
  'Rekha',
  'Rohit',
  'Sachin',
  'Sandeep',
  'Sanjay',
  'Sapna',
  'Sarita',
  'Shilpa',
  'Shreya',
  'Siddharth',
  'Sneha',
  'Sunil',
  'Sunita',
  'Suresh',
  'Swati',
  'Tanvi',
  'Varun',
  'Vidya',
  'Vijay',
  'Vinod',
]

const lastNames = [
  'Agarwal',
  'Banerjee',
  'Bhat',
  'Chakraborty',
  'Choudhury',
  'Das',
  'Desai',
  'Deshpande',
  'Ghosh',
  'Gupta',
  'Iyer',
  'Jain',
  'Joshi',
  'Kapoor',
  'Khan',
  'Kulkarni',
  'Kumar',
  'Malhotra',
  'Mehta',
  'Menon',
  'Mishra',
  'Mukherjee',
  'Nair',
  'Patel',
  'Pillai',
  'Rao',
  'Reddy',
  'Roy',
  'Saxena',
  'Sharma',
  'Shetty',
  'Singh',
  'Sinha',
  'Srivastava',
  'Thakur',
  'Tiwari',
  'Varma',
  'Venkatesh',
  'Verma',
  'Yadav',
]

export default class extends BaseSeeder {
  async run() {
    const records = []
    const existingUsers = await User.query().orderBy('id', 'asc')

    await EmpData.query().delete()

    for (const user of existingUsers) {
      records.push({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        empId: user.empId ?? null,
        mgrId: user.mgrId ?? null,
        fnroleId: user.fnroleId ?? null,
        dateOfJoining: user.dateOfJoining ?? DateTime.now().minus({ years: 5 }).startOf('day'),
        lastRoleChange: user.lastRoleChange ?? DateTime.now().minus({ years: 1 }).startOf('day'),
      })
    }

    for (let i = 1; i <= Math.max(100 - existingUsers.length, 0); i++) {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)]
      const last = lastNames[Math.floor(Math.random() * lastNames.length)]
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`
      const joiningDate = DateTime.now()
        .minus({ days: 365 * (2 + (i % 12)) })
        .startOf('day')
      const roleChangeDate = joiningDate.plus({ days: 120 + (i % 540) }).startOf('day')

      records.push({
        email,
        firstName: first,
        lastName: last,
        empId: 5000 + i,
        dateOfJoining: joiningDate,
        lastRoleChange:
          roleChangeDate > DateTime.now() ? DateTime.now().startOf('day') : roleChangeDate,
      })
    }

    await EmpData.createMany(records)
    console.log(`✅ Recreated ${records.length} employee records in emp_data with employment dates`)
  }
}
