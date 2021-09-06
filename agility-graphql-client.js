import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// default options for apollo to disable their caching
const defaultOptions = {
    watchQuery: {
        fetchPolicy: "no-cache",
        errorPolicy: "ignore",
    },
    query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
    },
};

const httpLink = createHttpLink({
    uri: () => {
        const type = global.IS_PREVIEW ? 'preview' : 'fetch';
        return `https://api.aglty.io/v1/${process.env.AGILITY_GUID}/${type}/${process.env.AGILITY_LOCALES}/graphql`
    }
  });

const authLink = setContext((_, { headers }) => {
    // return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            apiKey: global.IS_PREVIEW ? process.env.AGILITY_API_PREVIEW_KEY : process.env.AGILITY_API_FETCH_KEY,
        }
    }
});

// set up our apollo client
const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    defaultOptions
})
    
const getContext = ({ config }) => {
    return {
        headers: {
            apiKey: config.apiKey,
        },
    }
}

export { 
    client,
    getContext
};