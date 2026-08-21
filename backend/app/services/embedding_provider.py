import random
from abc import ABC, abstractmethod
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """ Generate embeddings for a list of texts """
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """ Generate embedding for a single query """
        pass

class MockEmbeddingProvider(EmbeddingProvider):
    """ Used for tests and local development """
    
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        logger.info(f"MockEmbeddingProvider generating embeddings for {len(texts)} texts.")
        # Generate stable mock vectors based on text length to allow minimal similarity variation
        vectors = []
        for t in texts:
            seed = len(t)
            random.seed(seed)
            vector = [random.uniform(-1.0, 1.0) for _ in range(self.dimension)]
            vectors.append(vector)
        return vectors

    async def embed_query(self, query: str) -> List[float]:
        logger.info(f"MockEmbeddingProvider generating embedding for query: {query[:50]}")
        seed = len(query)
        random.seed(seed)
        return [random.uniform(-1.0, 1.0) for _ in range(self.dimension)]

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """ Provider for OpenAI embeddings (e.g. text-embedding-3-small) """
    
    def __init__(self, api_key: str, model_name: str, base_url: Optional[str] = None):
        try:
            import httpx
            self.httpx = httpx
        except ImportError:
            raise ImportError("httpx is required. Run pip install httpx")
            
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = base_url or "https://api.openai.com/v1"
        self.client = self.httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=120.0
        )

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        response = await self.client.post("/embeddings", json={
            "model": self.model_name,
            "input": texts
        })
        response.raise_for_status()
        data = response.json()
        
        # Sort embeddings by index just in case
        embeddings_data = sorted(data["data"], key=lambda x: x["index"])
        return [e["embedding"] for e in embeddings_data]

    async def embed_query(self, query: str) -> List[float]:
        vectors = await self.embed_texts([query])
        return vectors[0]

def get_embedding_provider(provider_type: str, model_name: str, api_key: str, base_url: Optional[str] = None) -> EmbeddingProvider:
    if provider_type.lower() == "mock":
        return MockEmbeddingProvider()
    elif provider_type.lower() in ("openai", "compatible"):
        return OpenAIEmbeddingProvider(api_key=api_key, model_name=model_name, base_url=base_url)
    else:
        logger.warning(f"Unknown embedding provider type '{provider_type}', falling back to Mock provider")
        return MockEmbeddingProvider()
