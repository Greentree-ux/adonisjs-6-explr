1. Setup & Start
npm install
node ace db:seed                # Seed roles + first Sys Admin
npm run dev                     # Start the dev server

2. Create an Org Admin (as Sys Admin)
    1. Go to http://localhost:3333/login
    2. Log in with sysadmin@example.com / Change@Me123
    3. You'll be redirected to the Change Password screen — set a new password
    4. After changing, you land on the Manage Org Admins screen
    5. Fill in the Org Admin's email, name, and an initial password, then click Create Org Admin
3. Set Up Allowed Emails (as Org Admin)
    1. Log out, then log in with the Org Admin email/password you just created
    2. You'll be prompted to change the password — set a new one
    3. You land on the Allowed Emails screen
    4. Add email addresses of users who should be able to register and log in
    5. You can also navigate to Employee-Manager to manage manager assignments
4. Register & Log In (as a Regular User)
    1. Go to http://localhost:3333/register
    2. Register with an email that the Org Admin added to the allowed list
    3. After registration, log in at /login — you'll see Function Roles and Role Skills
Note: Both registration and login are blocked for emails not in the allowed list.