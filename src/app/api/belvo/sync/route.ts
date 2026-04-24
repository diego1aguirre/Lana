import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BELVO_BASE_URL = process.env.BELVO_BASE_URL || 'https://sandbox.belvo.com'
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD

function belvoAuth() {
  const credentials = `${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`
  return 'Basic ' + Buffer.from(credentials).toString('base64')
}

export async function POST(request: Request) {
  try {
    const { link_id, user_id } = await request.json()
    console.log('Sync started for link:', link_id, 'user:', user_id)

    const supabase = createClient()

    // Get user if not provided
    let userId = user_id
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }
    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 })
    }

    // Upsert profile
    await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' })

    // 1. Fetch accounts from Belvo
    console.log('Fetching Belvo accounts...')
    const accountsRes = await fetch(`${BELVO_BASE_URL}/api/accounts/?link=${link_id}`, {
      headers: {
        'Authorization': belvoAuth(),
        'Content-Type': 'application/json'
      }
    })
    const accountsData = await accountsRes.json()
    console.log('Belvo accounts response status:', accountsRes.status)
    console.log('Belvo accounts:', JSON.stringify(accountsData).slice(0, 500))

    const belvoAccounts = Array.isArray(accountsData) ? accountsData : (accountsData.results || [])
    console.log('Number of accounts:', belvoAccounts.length)

    // 2. Save accounts to Supabase
    let accountsSynced = 0
    const accountIdMap: Record<string, string> = {}

    for (const acc of belvoAccounts) {
      const accountData = {
        user_id: userId,
        name: acc.name || acc.institution?.name || 'Cuenta bancaria',
        type: mapAccountType(acc.type),
        balance: acc.balance?.current || acc.balance?.available || 0,
        currency: acc.currency || 'MXN',
        color: '#1B4FD8',
        icon: '🏦',
        is_active: true
      }

      const { data: savedAccount, error: accError } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single()

      if (accError) {
        console.error('Account insert error:', accError)
      } else {
        accountIdMap[acc.id] = savedAccount.id
        accountsSynced++
        console.log('Saved account:', savedAccount.name)
      }
    }

    // 3. Fetch transactions from Belvo
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 90)
    const dateFromStr = dateFrom.toISOString().split('T')[0]

    console.log('Fetching Belvo transactions from:', dateFromStr)
    const txRes = await fetch(
      `${BELVO_BASE_URL}/api/transactions/?link=${link_id}&date_from=${dateFromStr}`,
      {
        headers: {
          'Authorization': belvoAuth(),
          'Content-Type': 'application/json'
        }
      }
    )
    const txData = await txRes.json()
    console.log('Belvo transactions response status:', txRes.status)
    console.log('Belvo transactions sample:', JSON.stringify(txData).slice(0, 500))

    const belvoTransactions = Array.isArray(txData) ? txData : (txData.results || [])
    console.log('Number of transactions:', belvoTransactions.length)

    // 4. Get default categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_default', true)

    const categoryMap: Record<string, string> = {}
    if (categories) {
      for (const cat of categories) {
        categoryMap[cat.name.toLowerCase()] = cat.id
      }
    }

    // 5. Save transactions to Supabase
    let transactionsSynced = 0
    for (const tx of belvoTransactions) {
      const type = tx.type === 'INFLOW' ? 'income' : 'expense'
      const amount = Math.abs(tx.amount || 0)

      // Find best matching category
      let categoryId = null
      const belvoCategory = (tx.category || '').toLowerCase()
      if (belvoCategory.includes('food') || belvoCategory.includes('restaurant') || belvoCategory.includes('comida')) {
        categoryId = categoryMap['comida & restaurantes']
      } else if (belvoCategory.includes('transport') || belvoCategory.includes('uber')) {
        categoryId = categoryMap['transporte']
      } else if (belvoCategory.includes('entertainment') || belvoCategory.includes('entretenimiento')) {
        categoryId = categoryMap['entretenimiento']
      } else if (belvoCategory.includes('grocery') || belvoCategory.includes('supermarket')) {
        categoryId = categoryMap['supermercado']
      } else if (type === 'income') {
        categoryId = categoryMap['nómina'] || categoryMap['otros ingresos']
      } else {
        categoryId = categoryMap['otros gastos']
      }

      // Get account id
      const accountId = tx.account?.id ? accountIdMap[tx.account.id] : null

      const transactionData = {
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount,
        type,
        description: tx.description || tx.merchant?.name || 'Transacción',
        date: tx.value_date || tx.accounting_date || new Date().toISOString().split('T')[0],
        notes: `Importado de Belvo - ${tx.reference || ''}`
      }

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)

      if (txError) {
        console.error('Transaction insert error:', txError.message)
      } else {
        transactionsSynced++
      }
    }

    // 6. Update last_synced_at
    await supabase
      .from('belvo_links')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('link_id', link_id)

    console.log(`Sync complete: ${accountsSynced} accounts, ${transactionsSynced} transactions`)

    return NextResponse.json({
      success: true,
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced
    })

  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed', details: String(err) }, { status: 500 })
  }
}

function mapAccountType(belvoType: string): 'checking' | 'savings' | 'credit' | 'cash' {
  const t = (belvoType || '').toLowerCase()
  if (t.includes('saving') || t.includes('ahorro')) return 'savings'
  if (t.includes('credit') || t.includes('crédito')) return 'credit'
  if (t.includes('cash') || t.includes('efectivo')) return 'cash'
  return 'checking'
}
