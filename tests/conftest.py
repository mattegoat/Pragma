import pytest
from starkware.crypto.signature.signature import (get_random_private_key,
                                                  private_to_stark_key)
from utils import str_to_felt


@pytest.fixture
def private_and_public_publisher_keys():
    publisher_private_key = get_random_private_key()
    publisher_public_key = private_to_stark_key(publisher_private_key)
    return publisher_private_key, publisher_public_key


@pytest.fixture
def publisher():
    return str_to_felt("foo")
