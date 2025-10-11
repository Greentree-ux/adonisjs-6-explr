/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const FcmsController = () => import('#controllers/fcms_controller')
const FnFnrolesController = () => import('#controllers/fn_fnroles_controller')
const RoleskillsController = () => import('#controllers/roleskills_controller')

router.get('/', [FcmsController, 'index']).as('home')

router
  .get('/about', async (ctx) => {
    return ctx.view.render('pages/about', { title: 'About FCMs' })
  })
  .as('about')

router.get('/fnfnroles', [FnFnrolesController, 'index']).as('fnfnroles.index')
// eslint-disable-next-line prettier/prettier
router.get('/fnfnroles/:fnid/:roleno', [FnFnrolesController, 'show']).as('fnfnroles.show')
  .where('fnid', router.matchers.number())
  .where('roleno', router.matchers.number())

router.get('/roleskills', [RoleskillsController, 'index']).as('roleskills.index')
// eslint-disable-next-line prettier/prettier
router.get('/roleskills/:fnid/:roleno', [RoleskillsController, 'show']).as('roleskills.show')
  .where('fnid', router.matchers.number())
  .where('roleno', router.matchers.number())
