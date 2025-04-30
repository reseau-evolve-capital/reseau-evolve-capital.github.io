'use client';
import React, { JSX } from 'react';
import Image from 'next/image';
// Using default import from package
import { BlocksRenderer as BlocksRendererComponent } from '@strapi/blocks-react-renderer';
import { getStrapiMediaUrl } from '@/lib/api';

interface BlocksRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // Accept any type for content
  className?: string;
}

export default function BlocksRenderer({ content, className = "" }: BlocksRendererProps) {
  if (!content) {
    return null;
  }

  return (
    <div className={`blocks-content ${className}`}>
      <BlocksRendererComponent
        content={content}
        blocks={{
          // Define custom renderers for block types
          
            image: ({ image }) => {
              if (!image) return null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const imageUrl = getStrapiMediaUrl(image as any);
              
              const caption = image?.caption || '';
              
              return (
                <figure className="my-8">
                  <div className="relative mx-auto h-auto min-h-[300px] w-full max-w-3xl overflow-hidden rounded-lg">
                    <Image
                      src={imageUrl}
                      alt={caption || 'Blog image'}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {caption && (
                    <figcaption className="mt-2 text-center text-sm text-gray-600">
                      {caption}
                    </figcaption>
                  )}
                </figure>
              );
            },
            paragraph: ({ children }) => <p className="mb-4 text-base leading-relaxed text-gray-800">{children}</p>,
            heading: ({ children, level }) => {
              const Tag = `h${level}` as keyof JSX.IntrinsicElements;
              const sizes = {
                1: 'text-3xl font-bold mt-8 mb-4',
                2: 'text-2xl font-bold mt-6 mb-3',
                3: 'text-xl font-bold mt-5 mb-2',
                4: 'text-lg font-bold mt-4 mb-2',
                5: 'text-base font-bold mt-3 mb-1',
                6: 'text-sm font-bold mt-3 mb-1',
              };
              return <Tag className={`${sizes[level as 1]} text-gray-900`}>{children}</Tag>;
            },
            quote: ({ children }) => (
              <blockquote className="mb-4 border-l-4 border-[#F3903F] pl-4 italic text-gray-700">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <pre className="mb-4 overflow-x-auto rounded bg-gray-100 p-4 text-sm text-gray-800">
                <code>{children}</code>
              </pre>
            ),
            // list: ({ children, format }) => {
            //   const Component = format === 'ordered' ? 'ol' : 'ul';
            //   const className = format === 'ordered' 
            //     ? 'list-decimal mb-4 ml-6' 
            //     : 'list-disc mb-4 ml-6';
            //   return <Component className={className}>{children}</Component>;
            // },
            
          
          // Define custom renderers for marks
        //   mark: {
        //     bold: ({ children }) => <strong className="font-bold">{children}</strong>,
        //     italic: ({ children }) => <em className="italic">{children}</em>,
        //     underline: ({ children }) => <u className="underline">{children}</u>,
        //     code: ({ children }) => (
        //       <code className="rounded-md bg-gray-100 px-1 py-0.5 font-mono text-sm">
        //         {children}
        //       </code>
        //     ),
        //     link: ({ children, url }) => (
        //       <a 
        //         href={url} 
        //         className="text-[#E93E3A] underline hover:text-[#F3903F]"
        //         target="_blank" 
        //         rel="noopener noreferrer"
        //       >
        //         {children}
        //       </a>
        //     ),
        //   },
        }}
      />
    </div>
  );
} 