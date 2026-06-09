// Shopify Admin GraphQL client — merchant brings their own API key
export type ShopifyClientConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
};

const DEFAULT_API_VERSION = "2025-01";

export class ShopifyAdminClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor({ shopDomain, accessToken, apiVersion = DEFAULT_API_VERSION }: ShopifyClientConfig) {
    const domain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;
    this.endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    };
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    return json.data as T;
  }
}

// ─── GraphQL Operations ───────────────────────────────────────────────────────

export const SHOP_INFO_QUERY = `
  query ShopInfo {
    shop {
      id
      name
      email
      myshopifyDomain
      plan { displayName }
      currencyCode
      primaryDomain { url }
      createdAt
    }
  }
`;

export const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        status
        totalInventory
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        featuredImage { url altText }
        variants(first: 5) {
          nodes {
            id
            title
            price
            inventoryQuantity
            sku
          }
        }
      }
    }
  }
`;

export const ORDERS_QUERY = `
  query Orders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { id displayName email }
        lineItems(first: 5) {
          nodes {
            title
            quantity
            originalUnitPriceSet { shopMoney { amount currencyCode } }
          }
        }
      }
    }
  }
`;

export const ANALYTICS_QUERY = `
  query Analytics($from: DateTime!, $to: DateTime!) {
    shop {
      analytics {
        sessions: report(
          reportType: SESSIONS_BY_DEVICE_TYPE
          dateRange: { start: $from, end: $to }
        ) { data }
      }
    }
  }
`;

export const DRAFT_ORDER_CREATE = `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        status
        totalPriceSet { shopMoney { amount currencyCode } }
      }
      userErrors { field message }
    }
  }
`;

export const CHECKOUT_CREATE = `
  mutation CheckoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
        totalPriceV2 { amount currencyCode }
        lineItems(first: 10) {
          nodes {
            title
            quantity
            variant { id price }
          }
        }
      }
      checkoutUserErrors { field message code }
    }
  }
`;

export const CUSTOMERS_QUERY = `
  query Customers($first: Int!, $query: String) {
    customers(first: $first, query: $query) {
      nodes {
        id
        displayName
        email
        ordersCount
        totalSpentV2 { amount currencyCode }
        createdAt
        tags
      }
    }
  }
`;

export const INVENTORY_QUERY = `
  query Inventory($first: Int!) {
    inventoryItems(first: $first) {
      nodes {
        id
        sku
        tracked
        inventoryLevels(first: 5) {
          nodes {
            available
            location { name }
          }
        }
      }
    }
  }
`;

// ─── Storefront API (for cart/checkout via buyer-facing flows) ────────────────

export class ShopifyStorefrontClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(shopDomain: string, storefrontToken: string, apiVersion = DEFAULT_API_VERSION) {
    const domain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;
    this.endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    };
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data as T;
  }
}

export const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount { amount currencyCode }
          subtotalAmount { amount currencyCode }
        }
        lines(first: 20) {
          nodes {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price { amount currencyCode }
                product { title featuredImage { url } }
              }
            }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

export const CART_ADD_LINES = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        cost { totalAmount { amount currencyCode } }
        lines(first: 20) {
          nodes {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price { amount currencyCode }
                product { title }
              }
            }
          }
        }
      }
      userErrors { field message }
    }
  }
`;
