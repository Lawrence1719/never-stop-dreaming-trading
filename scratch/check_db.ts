import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCart() {
  const productId = 'c93f4c31-2bc4-42c1-a47b-5c71f9d6b254'
  const { data: cart, error } = await supabase
    .from('cart')
    .select('*')
    .eq('product_id', productId)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Cart items for product:', JSON.stringify(cart, null, 2))
}

checkCart()
