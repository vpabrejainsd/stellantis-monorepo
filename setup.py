from setuptools import setup, find_packages

# Read the contents of your README file
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

# Read the contents of your requirements file
with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = fh.read().splitlines()

setup(
    name="garage_ai_assigner",
    version="0.1.0",  # Initial version
    author="Your Name",
    author_email="your.email@example.com",
    description="An AI-powered job assignment system for vehicle workshops.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="<your-repository-url>", # URL to your project's repository
    packages=find_packages(), # Automatically find all packages (like 'core')
    install_requires=requirements, # List of dependencies
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License", # Choose a license
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.7',
    entry_points={
        'console_scripts': [
            'garage-assigner=main:main', # This creates a command 'garage-assigner' that runs the main() function in main.py
        ],
    },
)